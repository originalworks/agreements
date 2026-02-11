import { expect } from 'chai';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments';
import { fakeSignerWithAddress } from '../../helpers/utils';
import { ethers } from 'hardhat';

describe('AgreementRelationsRegistry: E2E', () => {
  it('non-agreement contracts can be holders but will not be included in the registry', async () => {
    const initialSetup = await deployInitialSetup();

    const [, , , , holder] = await ethers.getSigners();

    const adminHolder = {
      wallet: holder,
      account: holder.address,
      balance: 5000n,
      isAdmin: true,
    };

    const NonAgreementContractHolder =
      await ethers.getContractFactory('NonAgreementHolder');

    const nonAgreementContractHolder =
      await NonAgreementContractHolder.deploy();

    const { agreement: agreementERC20Contract } = await deployAgreementERC20({
      initialSetup,
      holders: [
        adminHolder,
        {
          wallet: holder,
          account: await nonAgreementContractHolder.getAddress(),
          balance: 5000n,
          isAdmin: false,
        },
      ],
    });

    const { agreement: agreementERC1155Contract } =
      await deployAgreementERC1155({
        initialSetup,
        holders: [
          adminHolder,
          {
            wallet: holder,
            account: await nonAgreementContractHolder.getAddress(),
            balance: 5000n,
            isAdmin: false,
          },
        ],
      });

    // no relation has been registered, reads fail
    await expect(
      initialSetup.agreementRelationsRegistry.parentsOf(
        await agreementERC20Contract.getAddress(),
        0,
      ),
    ).to.be.reverted;
    await expect(
      initialSetup.agreementRelationsRegistry.parentsOf(
        await agreementERC1155Contract.getAddress(),
        0,
      ),
    ).to.be.reverted;

    expect(
      await agreementERC1155Contract.balanceOf(
        await nonAgreementContractHolder.getAddress(),
        1,
      ),
    ).to.equal(5000n);
    expect(
      await agreementERC20Contract.balanceOf(
        await nonAgreementContractHolder.getAddress(),
      ),
    ).to.equal(5000n);
  });
  it('allow chained relations between different types of agreements', async () => {
    const initialSetup = await deployInitialSetup();

    const { agreement: agreementParentERC20, holders } =
      await deployAgreementERC20({ initialSetup, shares: [1000n, 500n] });

    const { agreement: agreementParentERC1155 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n, 500n],
    });

    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          holders[0],
          {
            account: await agreementParentERC1155.getAddress(),
            balance: 500n,
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
          {
            account: await agreementParentERC20.getAddress(),
            balance: 500n,
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
        ],
      }),
    ).to.not.be.reverted;

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          holders[0],
          {
            account: await agreementParentERC1155.getAddress(),
            balance: 500n,
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
          {
            account: await agreementParentERC20.getAddress(),
            balance: 500n,
            wallet: await fakeSignerWithAddress(),
            isAdmin: false,
          },
        ],
      }),
    ).to.not.be.reverted;
  });

  it('detect circular dependency for different types of agreements', async () => {
    const initialSetup = await deployInitialSetup();
    const ERC1155_TOKEN_ID = 1n;

    const { agreement: agreementParentERC20, holders } =
      await deployAgreementERC20({ initialSetup, shares: [1000n, 500n] });

    const { agreement: agreementParentERC1155 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n, 500n],
    });

    const { agreement: agreementChildERC1155 } = await deployAgreementERC1155({
      initialSetup,
      holders: [
        holders[0],
        {
          account: await agreementParentERC1155.getAddress(),
          balance: 500n,
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
        {
          account: await agreementParentERC20.getAddress(),
          balance: 500n,
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
      ],
    });

    const { agreement: agreementChildERC20 } = await deployAgreementERC20({
      initialSetup,
      holders: [
        holders[0],
        {
          account: await agreementParentERC1155.getAddress(),
          balance: 500n,
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
        {
          account: await agreementParentERC20.getAddress(),
          balance: 500n,
          wallet: await fakeSignerWithAddress(),
          isAdmin: false,
        },
      ],
    });

    await expect(
      agreementParentERC1155
        .connect(holders[0].wallet)
        .safeTransferFrom(
          holders[0].account,
          await agreementChildERC20.getAddress(),
          ERC1155_TOKEN_ID,
          100n,
          '0x00',
        ),
    ).to.be.reverted;

    await expect(
      agreementParentERC1155
        .connect(holders[0].wallet)
        .safeTransferFrom(
          holders[0].account,
          await agreementChildERC1155.getAddress(),
          ERC1155_TOKEN_ID,
          100n,
          '0x00',
        ),
    ).to.be.reverted;

    await expect(
      agreementParentERC20
        .connect(holders[0].wallet)
        .transfer(await agreementChildERC20.getAddress(), 100n),
    ).to.be.reverted;

    await expect(
      agreementParentERC20
        .connect(holders[0].wallet)
        .transfer(await agreementChildERC1155.getAddress(), 100n),
    ).to.be.reverted;
  });
});
