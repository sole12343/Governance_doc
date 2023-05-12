
const hre = require("hardhat");

//投票通过后，最少延长60(秒),才能执行任务
const MIN_DELAY = 60;
//需要达到总投票权(是erc20votes代币的total supply，不是此代币的总和代理数量)人数的2%才可能通过，否则放弃提案
const QUORUM_PERCENTAGE = 2;
//投票在3个区块内完成，以区块为单位，而不是时间
const VOTING_PERIOD = 3;
//发起提案后，经过1个区块后才能投票
const VOTING_DELAY = 1;

async function main() {

  [deployer, addr1, addr2, ...addrs] = await ethers.getSigners();

  //部署原始token
  const myTokenFactory = await hre.ethers.getContractFactory("MyToken");
  const myTokenContract = await myTokenFactory.deploy();
  await myTokenContract.deployed();
  console.log("deployed myTokenContract to:", myTokenContract.address);

  //部署新增投票token
  const myTokenWrapperFactory = await hre.ethers.getContractFactory("MyTokenWrapper");
  const myTokenWrapperContract = await myTokenWrapperFactory.deploy(myTokenContract.address);
  await myTokenWrapperContract.deployed();
  console.log("deployed myTokenWrapperContract to:", myTokenWrapperContract.address);

  //部署timelock-此处没给提案者和执行者账户地址
  const timeLockFactory = await hre.ethers.getContractFactory("TimeLock");
  const timeLockContract = await timeLockFactory.deploy(MIN_DELAY, [], []);
  await timeLockContract.deployed();
  console.log("deployed timeLockContract to:", timeLockContract.address);

  //部署Target
  const targetFactory = await hre.ethers.getContractFactory("Target");
  const targetContract = await targetFactory.deploy();
  await targetContract.deployed();
  console.log("deployed targetContract to:", targetContract.address);

  //部署GovernorContract
  const governorFactory = await hre.ethers.getContractFactory("GovernorContract");
  const governorContract = await governorFactory.deploy(
    myTokenWrapperContract.address,
    timeLockContract.address,
    QUORUM_PERCENTAGE,
    VOTING_PERIOD,
    VOTING_DELAY
  );
  await governorContract.deployed();
  console.log("deployed governorContract to:", governorContract.address);

  //初始化数据
  //提案角色
  const proposerRole = await timeLockContract.PROPOSER_ROLE();
  //分别给部署人和governorContract赋予发起提案角色
  await timeLockContract.grantRole(proposerRole, deployer.address);
  await timeLockContract.grantRole(proposerRole, governorContract.address);
  //给governorContract赋予执行提案角色
  const executorRole = await timeLockContract.EXECUTOR_ROLE();
  await timeLockContract.grantRole(executorRole, governorContract.address);
  //将target合约的Owner转给timelock合约,只有timelock才能调用target的setAge方法
  await targetContract.transferOwnership(timeLockContract.address);
  //收回部署人的管理员角色
  const adminRole = await timeLockContract.TIMELOCK_ADMIN_ROLE();
  await timeLockContract.revokeRole(adminRole, deployer.address);
  
  //新增投票token合约中存入所有的代币用于投票
  await myTokenContract.approve(myTokenWrapperContract.address,ethers.utils.parseEther("10000"));
  await myTokenWrapperContract.depositFor(deployer.address,ethers.utils.parseEther("8000"));
  //给账号授权才能投票
  await myTokenWrapperContract.delegate(deployer.address);

}

main();
