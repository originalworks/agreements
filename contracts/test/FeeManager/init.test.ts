import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { deployInitialSetup } from '../helpers/deployments'

describe('FeeManager.initialize', () => {
  it('correctly initializes values', async () => {
    const { feeManager, deployer } = await deployInitialSetup({
      paymentFee: BigNumber.from(9000),
      creationFee: BigNumber.from(1234),
    })

    expect(await feeManager.owner()).to.equal(deployer.address)
    expect(await feeManager.creationFee()).to.equal(1234)
    expect(await feeManager.paymentFee()).to.equal(9000)
  })

  it('emits events', async () => {
    const [deployer] = await ethers.getSigners()

    const block = await ethers.provider.getBlockNumber()
    const FeeManager = await ethers.getContractFactory('FeeManager')
    const feeManager = await upgrades.deployProxy(FeeManager, [1234, 9000], {
      kind: 'uups',
    })

    const ownershipTransferredEvent = await feeManager.queryFilter(
      'OwnershipTransferred',
      block,
    )

    const creationFeeChangedEvent = await feeManager.queryFilter(
      'CreationFeeChanged',
      block,
    )

    const paymentFeeChangedEvent = await feeManager.queryFilter(
      'PaymentFeeChanged',
      block,
    )

    expect(ownershipTransferredEvent[0].args!['previousOwner']).to.equal(
      ethers.constants.AddressZero,
    )
    expect(ownershipTransferredEvent[0].args!['newOwner']).to.equal(
      deployer.address,
    )

    expect(creationFeeChangedEvent[0].args!['creationFee']).to.equal(1234)

    expect(paymentFeeChangedEvent[0].args!['paymentFee']).to.equal(9000)
  })

  it('cannot be called twice', async () => {
    const FeeManager = await ethers.getContractFactory('FeeManager')
    const feeManager = await upgrades.deployProxy(FeeManager, [0, 0], {
      kind: 'uups',
    })

    await expect(feeManager.initialize(1, 2)).to.be.revertedWith(
      'Initializable: contract is already initialized',
    )
  })
})
