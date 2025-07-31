import { expect } from 'chai'
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments'
import { fakeSignerWithAddress } from '../helpers/utils'

describe('AgreementRelationsRegistry: different agreement types', () => {
  it('allow chained relations between different types of agreements', async () => {
    const initialSetup = await deployInitialSetup()

    const { agreement: agreementParentERC20, holders } =
      await deployAgreementERC20({ initialSetup, shares: [1000, 500] })

    const { agreement: agreementParentERC1155 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000, 500],
    })

    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          holders[0],
          {
            account: agreementParentERC1155.address,
            balance: '500',
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
          {
            account: agreementParentERC20.address,
            balance: '500',
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
        ],
      }),
    ).to.not.be.reverted

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          holders[0],
          {
            account: agreementParentERC1155.address,
            balance: '500',
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
          {
            account: agreementParentERC20.address,
            balance: '500',
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
        ],
      }),
    ).to.not.be.reverted
  })

  it('detect circular dependency for different types of agreements', async () => {
    const initialSetup = await deployInitialSetup()
    const ERC1155_TOKEN_ID = 1

    const { agreement: agreementParentERC20, holders } =
      await deployAgreementERC20({ initialSetup, shares: [1000, 500] })

    const { agreement: agreementParentERC1155 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000, 500],
    })

    const { agreement: agreementChildERC1155 } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        holders[0],
        {
          account: agreementParentERC1155.address,
          balance: '500',
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
        {
          account: agreementParentERC20.address,
          balance: '500',
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
      ],
    })

    const { agreement: agreementChildERC20 } = await deployAgreementERC20({
      initialSetup,
      holders: [
        holders[0],
        {
          account: agreementParentERC1155.address,
          balance: '500',
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
        {
          account: agreementParentERC20.address,
          balance: '500',
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
      ],
    })

    await expect(
      agreementParentERC1155
        .connect(holders[0].wallet)
        .safeTransferFrom(
          holders[0].account,
          agreementChildERC20.address,
          ERC1155_TOKEN_ID,
          100,
          '0x00',
        ),
    ).to.be.reverted

    await expect(
      agreementParentERC1155
        .connect(holders[0].wallet)
        .safeTransferFrom(
          holders[0].account,
          agreementChildERC1155.address,
          ERC1155_TOKEN_ID,
          100,
          '0x00',
        ),
    ).to.be.reverted

    await expect(
      agreementParentERC20
        .connect(holders[0].wallet)
        .transfer(agreementChildERC20.address, 100),
    ).to.be.reverted

    await expect(
      agreementParentERC20
        .connect(holders[0].wallet)
        .transfer(agreementChildERC1155.address, 100),
    ).to.be.reverted
  })
})
