const { expect } = require("chai");
const { ethers } = require("hardhat");


//注意，当重新运行
//npx hardhat run .\scripts\all-script.js --network localhost 时
//targetContract合约重新部署，地址会改变，所有也要修改下面地址
const governorContractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
const myTokenWrapperContractAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const targetContractAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

//修改target Age参数的值
let NEW_AGE_VALUE = Math.floor(Math.random() * 101);
//修改参数的方法
const FUNC = "setAge";
//提案的描述
const PROPOSAL_DESCRIPTION = "Change target age";


//投票通过后，最少延长60(秒),才能执行任务
const MIN_DELAY = 60;

//Against 0 反对,For 1 赞同,Abstain 2弃权
const voteWay = 1;
const reason = "just for practice";

describe("Governor Flow", function () {

    let targetContract;
    let governorContract;
    let myTokenWrapperContract;
    let proposalId;
    //let deployer;
    let addr1;
    //let addr2;

    beforeEach(async () => {
        [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();
        targetContract = await ethers.getContractAt("Target", targetContractAddress);
        governorContract = await ethers.getContractAt("GovernorContract", governorContractAddress);
        myTokenWrapperContract = await ethers.getContractAt("MyToken", myTokenWrapperContractAddress);
    })

    //测试只有timelock才能调用target setAge方法
    it("can only be changed through governance", async () => {
        await expect(targetContract.setAge(NEW_AGE_VALUE)).to.be.revertedWith("Ownable: caller is not the owner");
    })

    //测试整个流程
    it("proposes, votes, waits, queues, and then executes", async () => {
        // 发起调用Target setAge方法的提案
        const encodedFunctionCall = targetContract.interface.encodeFunctionData(FUNC, [NEW_AGE_VALUE])
        const proposeTx =  await governorContract.propose(
            [targetContract.address],
            [0],
            [encodedFunctionCall],
            PROPOSAL_DESCRIPTION
        );
        const proposeReceipt = await proposeTx.wait(1);
        //获取提案ID
        proposalId = proposeReceipt.events[0].args.proposalId;
        console.log(`Proposal Id: ${proposalId}`);
        //获取提案的状态
        let proposalState = await governorContract.state(proposalId);
        console.log(`Proposal State 1: ${proposalState}`);

        //发起提案后的状态为pendding,这时候还不能投票，我们新增1个区块后才能投票(VOTING_DELAY=1),所以我们给addr1在转1000
        await myTokenWrapperContract.transfer(addr1.address,ethers.utils.parseEther("1"));
        await myTokenWrapperContract.transfer(addr1.address,ethers.utils.parseEther("1"));
        proposalState = await governorContract.state(proposalId);
        //proposalId状态会变成active,这种情况下就可以投票
        console.log(`Proposal State 2: ${proposalState}`);

        //开始投票
        //Against 0 反对,For 1 赞同,Abstain 2弃权
        await governorContract.castVote(proposalId, voteWay);
        //获取投票数据  
        const proposalVotes =  await governorContract.proposalVotes(proposalId);
        console.log(`proposalVotes: ${proposalVotes}`);
        
        //从投票开始的区块算起，后面的3个区块是投票时间,我们做2个交易走完投票
        await myTokenWrapperContract.transfer(addr1.address,ethers.utils.parseEther("1"));
        await myTokenWrapperContract.transfer(addr1.address,ethers.utils.parseEther("1"));
        proposalState = await governorContract.state(proposalId);
        //proposalId状态会变成"4完成",这种情况下就可以投票
        console.log(`Proposal State 3: ${proposalState}`);

        //将提案放入队列
        const descriptionHash = ethers.utils.id(PROPOSAL_DESCRIPTION);
        await governorContract.queue([targetContract.address], [0], [encodedFunctionCall], descriptionHash);
            
        await moveTime(MIN_DELAY + 1);
        proposalState = await governorContract.state(proposalId);
        //proposalId状态会变成"5",这种情况下就可以投票
        console.log(`Proposal State 4: ${proposalState}`);
        
        //执行提案execute
        console.log("Executing...");
        await governorContract.execute([targetContract.address], [0], [encodedFunctionCall], descriptionHash);
        //这时候状态提案为6(Executed)
        proposalState = await governorContract.state(proposalId);
        console.log(`Proposal State 6: ${proposalState}`);
        
        //获取target的age值
        console.log((await targetContract.getAge()).toString());
        expect(await targetContract.getAge()).to.equal(NEW_AGE_VALUE);

    })
    
    async function moveBlocks(amount) {
        console.log("Moving blocks...");
        for (let index = 0; index < amount; index++) {
            await ethers.provider.send("evm_mine", []);
        }
        console.log(`Moved ${amount} blocks`)
    }

    async function moveTime(amount) {
        console.log("Moving blocks...")
        await ethers.provider.send("evm_increaseTime", [amount])
        console.log(`Moved forward in time ${amount} seconds`)
    }

})
