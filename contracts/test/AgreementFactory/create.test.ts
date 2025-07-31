import { expect } from 'chai'
import { ethers } from 'hardhat'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments'
import { Holder } from '../helpers/types'

describe('AgreementFactory.create', function () {
  let OWNER: Holder
  let HOLDER: Holder
  const DATA_HASH = `0x${'ab'.repeat(32)}`
  const ERC1155_TOKEN_ID = 1

  before(async () => {
    const [ownerAccount, holderAccount] = await ethers.getSigners()
    OWNER = {
      account: ownerAccount.address,
      isAdmin: true,
      balance: '500',
    }
    HOLDER = {
      account: holderAccount.address,
      isAdmin: false,
      balance: '700',
    }
  })
  it('should create an ERC20 token with holders', async function () {
    const initialSetup = await deployInitialSetup()
    const { agreement, holders, dataHash } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    })
    const holder1 = holders[0]
    const holder2 = holders[1]

    expect(await agreement.dataHash()).to.equal(dataHash)
    expect(await agreement.totalSupply()).to.equal(
      Number(holder1.balance) + Number(holder2.balance),
    )
    expect(await agreement.balanceOf(holder1.account)).to.equal(holder1.balance)
    expect(await agreement.balanceOf(holder2.account)).to.equal(holder2.balance)
    expect(await agreement.isAdmin(holder1.account)).to.equal(true)
    expect(await agreement.isAdmin(holder2.account)).to.equal(false)
  })
  it('should create an ERC1155 token with holders', async function () {
    const initialSetup = await deployInitialSetup()
    const { agreement, holders, dataHash } = await deployAgreementERC1155({
      initialSetup,
      shares: [500, 500],
    })
    const holder1 = holders[0]
    const holder2 = holders[1]

    expect(await agreement.uri(1)).to.equal(dataHash)
    expect(await agreement.totalSupply()).to.equal(
      Number(holder1.balance) + Number(holder2.balance),
    )
    expect(
      await agreement.balanceOf(holder1.account, ERC1155_TOKEN_ID),
    ).to.equal(holder1.balance)
    expect(
      await agreement.balanceOf(holder2.account, ERC1155_TOKEN_ID),
    ).to.equal(holder2.balance)
    expect(await agreement.isAdmin(holder1.account)).to.equal(true)
    expect(await agreement.isAdmin(holder2.account)).to.equal(false)
  })
  it('should allow multiple agreements of the token standard', async () => {
    const initialSetup = await deployInitialSetup()
    const { agreement: agreement1 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })

    const { agreement: agreement2 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })

    expect(agreement1.address).to.not.equal(agreement2.address)
  })
  it('should allow multiple agreements of different token standard', async () => {
    const initialSetup = await deployInitialSetup()
    const { agreement: agreement1 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000],
    })

    const { agreement: agreement2 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000],
    })

    expect(agreement1.address).to.not.equal(agreement2.address)
  })

  it('fails if the fee is too small', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup()

    await expect(
      agreementFactory.createERC20(DATA_HASH, [OWNER, HOLDER], [''], {
        value: (await feeManager.creationFee()).sub(1),
      }),
    ).to.be.revertedWith('AgreementFactory: Insufficient fee')

    await expect(
      agreementFactory.createERC1155(DATA_HASH, [OWNER, HOLDER], '', [''], {
        value: (await feeManager.creationFee()).sub(1),
      }),
    ).to.be.revertedWith('AgreementFactory: Insufficient fee')
  })

  it('deploys with zero fee', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup()

    await (await feeManager.setCreationFee(0)).wait()
    await agreementFactory.createERC20(DATA_HASH, [OWNER, HOLDER], [''])
  })

  it('allow holder with 0 balance if it is admin', async () => {
    const initialSetup = await deployInitialSetup()
    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: true,
            balance: '0',
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.not.be.reverted

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: true,
            balance: '0',
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.not.be.reverted
  })

  it('revert when holder has 0 balance and is not admin', async () => {
    const initialSetup = await deployInitialSetup()
    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: false,
            balance: '0',
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.be.reverted

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: false,
            balance: '0',
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.be.reverted
  })
})
