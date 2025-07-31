import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments'

describe('(INTEGRATION) FallbackVault', () => {
  it('sends funds to FallbackVault in case of failed claim of native coin from split', async () => {
    const [owner] = await ethers.getSigners()
    const incomingFunds = parseEther('3.33')
    const initialSetup = await deployInitialSetup({
      paymentFee: BigNumber.from('0'),
    })

    const ContractWithoutReceiveFunction = await ethers.getContractFactory(
      'ContractWithoutReceiveFunction',
    )
    const contractWithoutReceiveFunction =
      await ContractWithoutReceiveFunction.deploy()

    const { agreement } = await deployAgreementERC20({
      initialSetup,
      holders: [
        {
          account: contractWithoutReceiveFunction.address,
          isAdmin: true,
          balance: '1000',
          wallet: 0 as any,
        },
      ],
    })

    await owner.sendTransaction({
      value: incomingFunds,
      to: agreement.address,
    })

    await agreement.claimHolderFunds(
      contractWithoutReceiveFunction.address,
      ethers.constants.AddressZero,
    )

    expect(
      await initialSetup.fallbackVault.balances(
        contractWithoutReceiveFunction.address,
      ),
    ).to.equal(incomingFunds)

    expect(
      await ethers.provider.getBalance(initialSetup.fallbackVault.address),
    ).to.equal(incomingFunds)
  })
})
