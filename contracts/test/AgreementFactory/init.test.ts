import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { TokenStandard } from '@original-works/original-works-nest-service'
import { expect } from 'chai'
import { Wallet } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import { deployInitialSetup } from '../helpers/deployments'
import { InitialSetup } from '../helpers/types'

describe('AgreementFactory.initialize', () => {
  let owner: SignerWithAddress
  let initialSetup: InitialSetup

  let agreementERC20Implementation: string
  let agreementERC1155Implementation: string
  let feeManager: string
  // let lendingContract: string
  let agreementRelationsRegistry: string
  let splitCurrencyListManager: string
  let fallbackVault: string
  let namespaceRegistry: string

  beforeEach(async () => {
    ;[owner] = await ethers.getSigners()
    initialSetup = await deployInitialSetup()

    agreementERC20Implementation =
      initialSetup.agreementERC20Implementation.address
    agreementERC1155Implementation =
      initialSetup.agreementERC1155Implementation.address
    feeManager = initialSetup.feeManager.address
    // lendingContract = initialSetup.lendingContract.address
    agreementRelationsRegistry = initialSetup.agreementRelationsRegistry.address
    splitCurrencyListManager = initialSetup.splitCurrencyListManager.address
    fallbackVault = initialSetup.fallbackVault.address
    namespaceRegistry = initialSetup.namespaceRegistry.address
  })

  it('correctly initializes values', async () => {
    const AgreementFactory = await ethers.getContractFactory('AgreementFactory')
    const agreementFactory = await upgrades.deployProxy(
      AgreementFactory,
      [
        agreementERC20Implementation,
        agreementERC1155Implementation,
        feeManager,
        // lendingContract,
        agreementRelationsRegistry,
        splitCurrencyListManager,
        fallbackVault,
        namespaceRegistry,
      ],
      { kind: 'uups' },
    )
    const implementations = await agreementFactory.getAgreementImplementations()

    expect(await agreementFactory.owner()).to.equal(owner.address)
    expect(implementations['agreementERC20']).to.equal(
      agreementERC20Implementation,
    )
    expect(implementations['agreementERC1155']).to.equal(
      agreementERC1155Implementation,
    )
  })
  it('emits events', async () => {
    const AgreementFactory = await ethers.getContractFactory('AgreementFactory')
    const block = await ethers.provider.getBlockNumber()
    const agreementFactory = await upgrades.deployProxy(
      AgreementFactory,
      [
        agreementERC20Implementation,
        agreementERC1155Implementation,
        feeManager,
        // lendingContract,
        agreementRelationsRegistry,
        splitCurrencyListManager,
        fallbackVault,
        namespaceRegistry,
      ],
      { kind: 'uups' },
    )

    const agreementImplementationChangedEvents =
      await agreementFactory.queryFilter(
        'AgreementImplementationChanged',
        block,
      )

    const setImplementationERC20Event =
      agreementImplementationChangedEvents.find(
        (event) => event.args!['tokenStandard'] === TokenStandard.ERC20,
      )

    const setImplementationERC1155Event =
      agreementImplementationChangedEvents.find(
        (event) => event.args!['tokenStandard'] === TokenStandard.ERC1155,
      )

    const ownershipTransferredEvent = await agreementFactory.queryFilter(
      'OwnershipTransferred',
      block,
    )

    expect(
      setImplementationERC20Event!.args!['agreementImplementation'],
    ).to.equal(agreementERC20Implementation)
    expect(
      setImplementationERC1155Event!.args!['agreementImplementation'],
    ).to.equal(agreementERC1155Implementation)

    expect(ownershipTransferredEvent[0].args!['previousOwner']).to.equal(
      ethers.constants.AddressZero,
    )
    expect(ownershipTransferredEvent[0].args!['newOwner']).to.equal(
      owner.address,
    )
  })
  it('cannot be called twice', async () => {
    await expect(
      initialSetup.agreementFactory.connect(owner).initialize(
        agreementERC20Implementation,
        agreementERC1155Implementation,
        feeManager,
        // lendingContract,
        agreementRelationsRegistry,
        splitCurrencyListManager,
        fallbackVault,
        namespaceRegistry,
      ),
    ).to.be.revertedWith('Initializable: contract is already initialized')
  })
  it('fails for initialize with address zero', async () => {
    const AgreementFactory = await ethers.getContractFactory('AgreementFactory')

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          ethers.constants.AddressZero,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith('AgreementFactory: agreement address cannot be 0')

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          ethers.constants.AddressZero,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith('AgreementFactory: agreement address cannot be 0')

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          ethers.constants.AddressZero,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at FeeManager address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          ethers.constants.AddressZero,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at AgreementRelationsRegistry address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          ethers.constants.AddressZero,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at SplitCurrencyListManager address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          ethers.constants.AddressZero,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at FallbackVault address',
    )
  })
  it('fails for non-contract', async () => {
    const AgreementFactory = await ethers.getContractFactory('AgreementFactory')

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          Wallet.createRandom().address,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: agreement implementation must be a contract',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          Wallet.createRandom().address,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: agreement implementation must be a contract',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          Wallet.createRandom().address,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at FeeManager address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          Wallet.createRandom().address,
          splitCurrencyListManager,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at AgreementRelationsRegistry address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          Wallet.createRandom().address,
          fallbackVault,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at SplitCurrencyListManager address',
    )

    await expect(
      upgrades.deployProxy(
        AgreementFactory,
        [
          agreementERC20Implementation,
          agreementERC1155Implementation,
          feeManager,
          agreementRelationsRegistry,
          splitCurrencyListManager,
          Wallet.createRandom().address,
          namespaceRegistry,
        ],
        { kind: 'uups' },
      ),
    ).to.be.revertedWith(
      'AgreementFactory: Wrong interface at FallbackVault address',
    )
  })
})
