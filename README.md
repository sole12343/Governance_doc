# Governance_doc

## 一、整体框架
### 1. CheckPoint快照
通过ERC20Votes合约
![CheckPoint测试流程](https://github.com/sole12343/Governance_doc/blob/main/png/1.png )

### 2. TimelockController时间控制器
DAO中修改合约参数或升级等功能，是不能人为干预，必须经过发起提案、投票、最后是执行。TimelockController的职责就是执行。

如果是compound模式，Timelock合约会有更大的权限，并且Governance合约权限减少。

### 3. 提案的流程和状态变化

![提案流程](https://github.com/sole12343/Governance_doc/blob/main/png/2.png )

### 4. 治理合约的关系

![合约间的关系](https://github.com/sole12343/Governance_doc/blob/main/png/3.png )


### 5. 对于不支持ERC20Votes标准的代币
如果想要使用一种原本不支持ERC20Votes标准的ERC20代币作为治理token，只需要对它进行包装，1:1生成支持ERC20Votes的新token即可，测试案例包含这块
![不标准的代币处理](https://github.com/sole12343/Governance_doc/blob/main/png/4.png )

## 二、代码详解
见代码详解文件夹的markdown

## 三、治理合约js测试案例


## 四、compound