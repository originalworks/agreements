import { expect } from 'chai'
import { ethers } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { getEvent } from '../../helpers/utils'

describe('AgreementERC20.initialize', () => {
  const DATA_HASH = `0x${'ab'.repeat(32)}`
  it('should initialize values properly', async () => {
    const [, holder1Account, holder2Account] = await ethers.getSigners()
    const holder1Balance = 600
    const holder2Balance = 400
    const initialSetup = await deployInitialSetup()
    const { agreement } = await deployAgreementERC20({
      initialSetup,
      holders: [
        {
          account: holder1Account.address,
          balance: holder1Balance.toString(),
          isAdmin: true,
          wallet: holder1Account,
        },
        {
          account: holder2Account.address,
          balance: holder2Balance.toString(),
          isAdmin: false,
          wallet: holder2Account,
        },
      ],
      dataHash: DATA_HASH,
    })
    expect(await agreement.dataHash()).to.equal(DATA_HASH)
    expect(await agreement.totalSupply()).to.equal(1000)
    expect(await agreement.balanceOf(holder1Account.address)).to.equal(600)
    expect(await agreement.balanceOf(holder2Account.address)).to.equal(400)
    expect(await agreement.isAdmin(holder1Account.address)).to.equal(true)
    expect(await agreement.isAdmin(holder2Account.address)).to.equal(false)
  })
  it('emits events', async () => {
    const Agreement = await ethers.getContractFactory('AgreementERC20')
    const [, holder1Account, holder2Account] = await ethers.getSigners()
    const holder1Balance = 600
    const holder2Balance = 400
    const { agreementFactory, feeManager } = await deployInitialSetup()

    const createTx = agreementFactory.createERC20(
      DATA_HASH,
      [
        {
          account: holder1Account.address,
          balance: holder1Balance.toString(),
          isAdmin: true,
        },
        {
          account: holder2Account.address,
          balance: holder2Balance.toString(),
          isAdmin: false,
        },
      ],
      ['ABC123'],
      { value: await feeManager.creationFee() },
    )

    const event = await getEvent(createTx, agreementFactory, 'AgreementCreated')

    const agreementAddress = event.args[0]
    const agreement = Agreement.attach(agreementAddress)

    await expect(Promise.resolve(createTx))
      .to.emit(agreement, 'AdminAdded')
      .withArgs(holder1Account.address)
    await expect(Promise.resolve(createTx))
      .to.emit(agreement, 'DataHashChanged')
      .withArgs(DATA_HASH)
  })

  it('cannot be called twice', async () => {
    const initialSetup = await deployInitialSetup()
    const { agreement } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })
    const {
      feeManager,
      defaultHolders,
      agreementRelationsRegistry,
      splitCurrencyListManager,
      fallbackVault,
      namespaceRegistry,
    } = initialSetup
    await expect(
      agreement.initialize(
        DATA_HASH,
        [{ account: defaultHolders[0].address, balance: '100', isAdmin: true }],
        splitCurrencyListManager.address,
        feeManager.address,
        agreementRelationsRegistry.address,
        fallbackVault.address,
        namespaceRegistry.address,
        ['ABC123'],
      ),
    ).to.be.revertedWith('Initializable: contract is already initialized')
  })

  it('fails when there are no holders', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(DATA_HASH, [], ['ABC123'], {
        value: await feeManager.creationFee(),
      }),
    ).to.be.revertedWith('AgreementERC20: No holders')
  })

  it('fails if first holder is not an admin', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(
        DATA_HASH,
        [
          { account: defaultHolders[0].address, balance: 600, isAdmin: false },
          { account: defaultHolders[1].address, balance: 400, isAdmin: false },
        ],
        ['ABC123'],
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC20: First holder must be admin')
  })

  it('fails if the a holder balance is zero', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(
        DATA_HASH,
        [
          { account: defaultHolders[0].address, balance: 600, isAdmin: true },
          { account: defaultHolders[1].address, balance: 0, isAdmin: false },
        ],
        ['ABC123'],
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC20: Holder balance is zero')
  })

  it('fails if holder is zero address', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(
        DATA_HASH,
        [
          { account: defaultHolders[0].address, balance: 600, isAdmin: true },
          {
            account: ethers.constants.AddressZero,
            balance: 400,
            isAdmin: false,
          },
        ],
        ['ABC123'],
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC20: Holder account is zero')
  })

  it('fails if holder is duplicated', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(
        DATA_HASH,
        [
          { account: defaultHolders[0].address, balance: 600, isAdmin: true },
          {
            account: defaultHolders[0].address,
            balance: 400,
            isAdmin: false,
          },
        ],
        ['ABC123'],
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC20: Duplicate holder')
  })
})
