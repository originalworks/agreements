import { expect } from 'chai'
import { ethers } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { fakeSignerWithAddress } from '../../helpers/utils'

describe('(FUNCTIONAL) AgreementERC20: Circular dependency', () => {
  async function setup() {
    const initialSetup = await deployInitialSetup()
    const [, , , , userWallet] = await ethers.getSigners()
    const userHolder = {
      account: userWallet.address,
      balance: '500',
      isAdmin: true,
      wallet: userWallet,
    }

    const { agreement: agreementGrandparent } = await deployAgreementERC20({
      initialSetup,
      holders: [userHolder],
    })

    const { agreement: agreementParent } = await deployAgreementERC20({
      initialSetup,
      holders: [
        userHolder,
        {
          account: agreementGrandparent.address,
          balance: '500',
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    })

    const { agreement: agreementParent2 } = await deployAgreementERC20({
      initialSetup,

      holders: [userHolder],
    })

    const { agreement: agreementChild } = await deployAgreementERC20({
      initialSetup,

      holders: [
        userHolder,
        {
          account: agreementParent.address,
          balance: '500',
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
        {
          account: agreementParent2.address,
          balance: '500',
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    })
    return {
      agreementParent,
      agreementChild,
      agreementGrandparent,
      agreementParent2,
      initialSetup,
      userHolder,
    }
  }
  it("Doesn't allow circular dependency between agreements", async () => {
    const { agreementParent, userHolder, agreementChild } = await setup()
    await expect(
      agreementParent
        .connect(userHolder.wallet)
        .transfer(agreementChild.address, 100),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })
  it('Checks for first level of relationship', async () => {
    const initialSetup = await deployInitialSetup()
    const {
      agreement: agreement1,
      holders: [holder],
    } = await deployAgreementERC20({ initialSetup, shares: [500] })
    const { agreement: agreement2 } = await deployAgreementERC20({
      initialSetup,
      shares: [500],
    })

    await agreement1.connect(holder.wallet).transfer(agreement2.address, 100)
    await expect(
      agreement2.connect(holder.wallet).transfer(agreement1.address, 100),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })
  it('Checks for third and fourth level of relationship', async () => {
    const { agreementGrandparent, userHolder, agreementChild, initialSetup } =
      await setup()

    await expect(
      agreementGrandparent
        .connect(userHolder.wallet)
        .transfer(agreementChild.address, 100),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )

    const { agreement: agreementGrandGrandParent } = await deployAgreementERC20(
      { initialSetup, holders: [userHolder] },
    )
    await agreementGrandparent
      .connect(userHolder.wallet)
      .transfer(agreementGrandGrandParent.address, 100)

    await expect(
      agreementGrandGrandParent
        .connect(userHolder.wallet)
        .transfer(agreementChild.address, 100),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })
  it('Check for transferOwned too', async () => {
    const {
      userHolder,
      agreementGrandparent,
      agreementParent,
      agreementChild,
    } = await setup()
    await expect(
      agreementGrandparent
        .connect(userHolder.wallet)
        .transferOwnedERC20Shares(
          agreementParent.address,
          agreementChild.address,
          100,
        ),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })

  it('Allow for transfer if receiver is no longer related to sender', async () => {
    const { userHolder, agreementParent, agreementChild, agreementParent2 } =
      await setup()

    await agreementParent
      .connect(userHolder.wallet)
      .transferOwnedERC20Shares(agreementChild.address, userHolder.account, 500)

    await agreementParent
      .connect(userHolder.wallet)
      .transfer(agreementChild.address, 100)

    expect(await agreementParent.balanceOf(agreementChild.address)).to.equal(
      100,
    )
    await expect(
      agreementParent2
        .connect(userHolder.wallet)
        .transfer(agreementChild.address, 100),
    ).to.be.revertedWith(
      'AgreementRelationsRegistry: Circular dependency not allowed',
    )
  })
})
