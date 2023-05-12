// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.0) (governance/extensions/GovernorCountingSimple.sol)

pragma solidity ^0.8.0;

import "../Governor.sol";

/**
 * @dev Extension of {Governor} for simple, 3 options, vote counting.
 *
 * _Available since v4.3._
 */
abstract contract GovernorCountingSimple is Governor {
    /**
     * @dev Supported vote types. Matches Governor Bravo ordering.
     */
    enum VoteType {
        Against,
        For,
        Abstain
    }
    //记录某个提案的三种票的数量
    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => ProposalVote) private _proposalVotes;//每个提案id对应一个提案vote结构体

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    //注意：这是投票计数和提案的规则说明，可能需要覆盖，也可以自定义的创新投票的规则
    //默认情况下是 支持反对弃权三种票 & 赞成和弃权都算进法定人数中去
    /**
     * 支持（support）：
        support=bravo：表示投票选项有3种，0 = 反对（Against），1 = 赞成（For），2 = 弃权（Abstain）。这种模式在GovernorBravo中使用。
        法定人数（quorum）：

        quorum=bravo：表示只有赞成票计入法定人数。
        quorum=for,abstain：表示赞成票和弃权票都计入法定人数。
        自定义参数（params）：

        如果某个投票计数模块使用了编码的params，则应在params键下使用一个描述行为的唯一名称。例如：
        params=fractional：可能指的是一种投票方案，其中票数在赞成/反对/弃权之间进行分数划分。
        params=erc721：可能指的是一种方案，其中特定的NFT被委托投票。
     */ 
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=bravo&quorum=for,abstain";
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    /**
     * @dev Accessor to the internal vote counts.
     */
    //给定某个提案id返回此提案的三种选票的数量
    function proposalVotes(uint256 proposalId)
        public
        view
        virtual
        returns (
            uint256 againstVotes,
            uint256 forVotes,
            uint256 abstainVotes
        )
    {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return (proposalVote.againstVotes, proposalVote.forVotes, proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    // quorum()是通过计算给定区块号的代币的totalsupply * 法定人数的比例来得到的
    // 注意：这里如果修改上面的计算模式，可能也要重写修改，此处是计算投票赞成+弃权的总数 
    function _quorumReached(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        return quorum(proposalSnapshot(proposalId)) <= proposalVote.forVotes + proposalVote.abstainVotes;
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    // 此处只有赞成票 > 反对票，投票才会成功
    // 注意：此处可能需要覆盖重写
    function _voteSucceeded(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        return proposalVote.forVotes > proposalVote.againstVotes;
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    // 对某一个地址的一次投票行为，进行计数，注意：如果对上述投票模型进行自定义修改，此处也需要重写
    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        require(!proposalVote.hasVoted[account], "GovernorVotingSimple: vote already cast");
        proposalVote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert("GovernorVotingSimple: invalid value for enum VoteType");
        }
    }
}
