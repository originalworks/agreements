import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';
import { fakeSignerWithAddress } from '../../helpers/utils';

describe('(FUNCTIONAL) AgreementERC1155: Circular dependency', () => {
  const TOKEN_ID = 1n;
  async function setup() {
    const initialSetup = await deployInitialSetup();
    const [, , , , userWallet] = await ethers.getSigners();
    const userHolder = {
      account: userWallet.address,
      balance: 500n,
      isAdmin: true,
      wallet: userWallet,
    };

    const { agreement: agreementGrandparent } = await deployAgreementERC1155({
      initialSetup,
      holders: [userHolder],
    });

    const { agreement: agreementParent } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        userHolder,
        {
          account: await agreementGrandparent.getAddress(),
          balance: 500n,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    });

    const { agreement: agreementParent2 } = await deployAgreementERC1155({
      initialSetup,
      holders: [userHolder],
    });

    const { agreement: agreementChild } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        userHolder,
        {
          account: await agreementParent.getAddress(),
          balance: 500n,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
        {
          account: await agreementParent2.getAddress(),
          balance: 500n,
          isAdmin: false,
          wallet: await fakeSignerWithAddress(),
        },
      ],
    });
    return {
      agreementParent,
      agreementChild,
      agreementGrandparent,
      agreementParent2,
      initialSetup,
      userHolder,
    };
  }

  it("Doesn't allow circular dependency between agreements", async () => {
    const { agreementParent, userHolder, agreementChild, initialSetup } =
      await setup();
    await expect(
      agreementParent
        .connect(userHolder.wallet)
        .safeTransferFrom(
          userHolder.account,
          await agreementChild.getAddress(),
          TOKEN_ID,
          100,
          '0x00',
        ),
    ).to.be.revertedWithCustomError(
      initialSetup.agreementRelationsRegistry,
      'CircularDependency',
    );
  });
  it('Checks for first level of relationship', async () => {
    const initialSetup = await deployInitialSetup();
    const {
      agreement: agreement1,
      holders: [holder],
    } = await deployAgreementERC1155({ initialSetup, shares: [500n] });
    const { agreement: agreement2 } = await deployAgreementERC1155({
      initialSetup,
      shares: [500n],
    });

    await agreement1
      .connect(holder.wallet)
      .safeTransferFrom(
        holder.account,
        await agreement2.getAddress(),
        TOKEN_ID,
        100n,
        '0x00',
      );
    await expect(
      agreement2
        .connect(holder.wallet)
        .safeTransferFrom(
          holder.account,
          await agreement1.getAddress(),
          TOKEN_ID,
          100n,
          '0x00',
        ),
    ).to.be.revertedWithCustomError(
      initialSetup.agreementRelationsRegistry,
      'CircularDependency',
    );
  });
  it('Checks for third level of relationship', async () => {
    const { agreementGrandparent, userHolder, agreementChild, initialSetup } =
      await setup();

    await expect(
      agreementGrandparent
        .connect(userHolder.wallet)
        .safeTransferFrom(
          userHolder.account,
          await agreementChild.getAddress(),
          TOKEN_ID,
          100n,
          '0x00',
        ),
    ).to.be.revertedWithCustomError(
      initialSetup.agreementRelationsRegistry,
      'CircularDependency',
    );
  });
  it('Check for transferOwned too', async () => {
    const {
      userHolder,
      agreementGrandparent,
      agreementParent,
      agreementChild,
      initialSetup,
    } = await setup();
    await expect(
      agreementGrandparent
        .connect(userHolder.wallet)
        .transferOwnedERC1155Shares(
          await agreementParent.getAddress(),
          await agreementChild.getAddress(),
          100n,
        ),
    ).to.be.revertedWithCustomError(
      initialSetup.agreementRelationsRegistry,
      'CircularDependency',
    );
  });

  it('Allow for transfer if receiver is no longer related to sender', async () => {
    const {
      userHolder,
      agreementParent,
      agreementChild,
      agreementParent2,
      initialSetup,
    } = await setup();

    await agreementParent
      .connect(userHolder.wallet)
      .transferOwnedERC1155Shares(
        await agreementChild.getAddress(),
        userHolder.account,
        500n,
      );

    await agreementParent
      .connect(userHolder.wallet)
      .safeTransferFrom(
        userHolder.account,
        await agreementChild.getAddress(),
        TOKEN_ID,
        100n,
        '0x00',
      );

    expect(
      await agreementParent.balanceOf(
        await agreementChild.getAddress(),
        TOKEN_ID,
      ),
    ).to.equal(100n);
    await expect(
      agreementParent2
        .connect(userHolder.wallet)
        .safeTransferFrom(
          userHolder.account,
          await agreementChild.getAddress(),
          TOKEN_ID,
          100n,
          '0x00',
        ),
    ).to.be.revertedWithCustomError(
      initialSetup.agreementRelationsRegistry,
      'CircularDependency',
    );
  });
});
