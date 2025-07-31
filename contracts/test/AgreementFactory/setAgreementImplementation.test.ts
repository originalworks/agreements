import { expect } from 'chai'
import { ethers } from 'hardhat'
import { TokenStandard } from '@original-works/original-works-nest-service'
import { deployInitialSetup } from '../helpers/deployments'

describe('AgreementFactory.setAgreementImplementation', () => {
  it('can change ERC20 implementation', async () => {
    const { agreementFactory, agreementERC20Implementation } =
      await deployInitialSetup()

    const Agreement = await ethers.getContractFactory('AgreementERC20')
    const anotherAgreementERC20Implementation = await Agreement.deploy()
    await anotherAgreementERC20Implementation.deployed()

    const implementationsBefore =
      await agreementFactory.getAgreementImplementations()

    expect(implementationsBefore['agreementERC20']).to.equal(
      agreementERC20Implementation.address,
    )
    await agreementFactory.setAgreementImplementation(
      anotherAgreementERC20Implementation.address,
      TokenStandard.ERC20,
    )

    const implementationsAfter =
      await agreementFactory.getAgreementImplementations()
    expect(implementationsAfter['agreementERC20']).to.equal(
      anotherAgreementERC20Implementation.address,
    )
  })
  it('can change ERC1155 implementation', async () => {
    const { agreementFactory, agreementERC1155Implementation } =
      await deployInitialSetup()

    const Agreement = await ethers.getContractFactory('AgreementERC1155')
    const anotherAgreementERC1155Implementation = await Agreement.deploy()
    await anotherAgreementERC1155Implementation.deployed()

    const implementationsBefore =
      await agreementFactory.getAgreementImplementations()

    expect(implementationsBefore['agreementERC1155']).to.equal(
      agreementERC1155Implementation.address,
    )
    await agreementFactory.setAgreementImplementation(
      anotherAgreementERC1155Implementation.address,
      TokenStandard.ERC1155,
    )

    const implementationsAfter =
      await agreementFactory.getAgreementImplementations()
    expect(implementationsAfter['agreementERC1155']).to.equal(
      anotherAgreementERC1155Implementation.address,
    )
  })
  it('emits an event on ERC20 implementation change', async () => {
    const { agreementFactory } = await deployInitialSetup()

    const Agreement = await ethers.getContractFactory('AgreementERC20')
    const anotherAgreementERC20Implementation = await Agreement.deploy()
    await anotherAgreementERC20Implementation.deployed()

    await expect(
      agreementFactory.setAgreementImplementation(
        anotherAgreementERC20Implementation.address,
        TokenStandard.ERC20,
      ),
    )
      .to.emit(agreementFactory, 'AgreementImplementationChanged')
      .withArgs(
        anotherAgreementERC20Implementation.address,
        TokenStandard.ERC20,
      )
  })
  it('emits an event on ERC1155 implementation change', async () => {
    const { agreementFactory } = await deployInitialSetup()

    const Agreement = await ethers.getContractFactory('AgreementERC1155')
    const anotherAgreementERC1155Implementation = await Agreement.deploy()
    await anotherAgreementERC1155Implementation.deployed()

    await expect(
      agreementFactory.setAgreementImplementation(
        anotherAgreementERC1155Implementation.address,
        TokenStandard.ERC1155,
      ),
    )
      .to.emit(agreementFactory, 'AgreementImplementationChanged')
      .withArgs(
        anotherAgreementERC1155Implementation.address,
        TokenStandard.ERC1155,
      )
  })
  it('can only be called by the owner', async () => {
    const [, otherAccount] = await ethers.getSigners()

    const { agreementFactory, lendingToken } = await deployInitialSetup()

    await expect(
      agreementFactory
        .connect(otherAccount)
        .setAgreementImplementation(lendingToken.address, TokenStandard.ERC20),
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('cannot be set to 0', async () => {
    const { agreementFactory } = await deployInitialSetup()

    await expect(
      agreementFactory.setAgreementImplementation(
        ethers.constants.AddressZero,
        TokenStandard.ERC20,
      ),
    ).to.be.revertedWith('AgreementFactory: agreement address cannot be 0')
  })

  it('cannot be set to a non-contract', async () => {
    const [, otherAccount] = await ethers.getSigners()

    const { agreementFactory } = await deployInitialSetup()

    await expect(
      agreementFactory.setAgreementImplementation(
        otherAccount.address,
        TokenStandard.ERC20,
      ),
    ).to.be.revertedWith(
      'AgreementFactory: agreement implementation must be a contract',
    )
  })
})
