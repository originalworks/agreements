import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { parseEther } from 'ethers';

describe('(INTEGRATION) FallbackVault', () => {
  it('sends funds to FallbackVault in case of failed claim of native coin from split', async () => {
    const [owner] = await ethers.getSigners();
    const incomingFunds = parseEther('3.33');
    const initialSetup = await deployInitialSetup({
      paymentFee: 0n,
    });

    const ContractWithoutReceiveFunction = await ethers.getContractFactory(
      'ContractWithoutReceiveFunction',
    );
    const contractWithoutReceiveFunction =
      await ContractWithoutReceiveFunction.deploy();

    const { agreement } = await deployAgreementERC20({
      initialSetup,
      holders: [
        {
          account: await contractWithoutReceiveFunction.getAddress(),
          isAdmin: true,
          balance: 1000n,
          wallet: 0 as any,
        },
      ],
    });

    await owner.sendTransaction({
      value: incomingFunds,
      to: await agreement.getAddress(),
    });

    await agreement.claimHolderFunds(
      await contractWithoutReceiveFunction.getAddress(),
      ethers.ZeroAddress,
    );

    expect(
      await initialSetup.fallbackVault.balances(
        await contractWithoutReceiveFunction.getAddress(),
      ),
    ).to.equal(incomingFunds);

    expect(
      await ethers.provider.getBalance(
        await initialSetup.fallbackVault.getAddress(),
      ),
    ).to.equal(incomingFunds);
  });
});
