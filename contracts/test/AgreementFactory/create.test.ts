import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployAgreementERC20,
  deployInitialSetup,
} from '../helpers/deployments';
import { Holder } from '../helpers/types';

describe('AgreementFactory.create', function () {
  let OWNER: Holder;
  let HOLDER: Holder;

  const ERC1155_TOKEN_ID = 1n;

  before(async () => {
    const [ownerAccount, holderAccount] = await ethers.getSigners();
    OWNER = {
      account: ownerAccount.address,
      isAdmin: true,
      balance: 500n,
    };
    HOLDER = {
      account: holderAccount.address,
      isAdmin: false,
      balance: 700n,
    };
  });
  it('should create an ERC20 token with holders', async function () {
    const initialSetup = await deployInitialSetup();
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500n, 500n],
    });
    const holder1 = holders[0];
    const holder2 = holders[1];

    expect(await agreement.totalSupply()).to.equal(
      Number(holder1.balance) + Number(holder2.balance),
    );
    expect(await agreement.balanceOf(holder1.account)).to.equal(
      holder1.balance,
    );
    expect(await agreement.balanceOf(holder2.account)).to.equal(
      holder2.balance,
    );
    expect(await agreement.isAdmin(holder1.account)).to.equal(true);
    expect(await agreement.isAdmin(holder2.account)).to.equal(false);
  });
  it('should create an ERC1155 token with holders', async function () {
    const initialSetup = await deployInitialSetup();
    const tokenUri = 'tokenUri';
    const contractUri = 'contractUri';
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500n, 500n],
      tokenUri,
      contractUri,
    });
    const holder1 = holders[0];
    const holder2 = holders[1];

    expect(await agreement.uri(1)).to.equal(tokenUri);
    expect(await agreement.contractURI()).to.equal(contractUri);
    expect(await agreement.totalSupply()).to.equal(
      Number(holder1.balance) + Number(holder2.balance),
    );
    expect(
      await agreement.balanceOf(holder1.account, ERC1155_TOKEN_ID),
    ).to.equal(holder1.balance);
    expect(
      await agreement.balanceOf(holder2.account, ERC1155_TOKEN_ID),
    ).to.equal(holder2.balance);
    expect(await agreement.isAdmin(holder1.account)).to.equal(true);
    expect(await agreement.isAdmin(holder2.account)).to.equal(false);
  });
  it('should allow multiple agreements of the token standard', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement: agreement1 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });

    const { agreement: agreement2 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });

    expect(await agreement1.getAddress()).to.not.equal(
      await agreement2.getAddress(),
    );
  });
  it('should allow multiple agreements of different token standard', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement: agreement1 } = await deployAgreementERC20({
      initialSetup,
      shares: [1000n],
    });

    const { agreement: agreement2 } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n],
    });

    expect(await agreement1.getAddress()).to.not.equal(agreement2.getAddress());
  });

  it('fails if the fee is too small', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup();

    await expect(
      agreementFactory.createERC20(
        { holders: [OWNER, HOLDER], unassignedRwaId: '' },
        {
          value: (await feeManager.creationFee()) - 1n,
        },
      ),
    ).to.be.revertedWithCustomError(agreementFactory, 'IncorrectCreationFee');

    await expect(
      agreementFactory.createERC1155(
        {
          holders: [OWNER, HOLDER],
          unassignedRwaId: '',
          tokenUri: '',
          contractURI: '',
        },
        {
          value: (await feeManager.creationFee()) - 1n,
        },
      ),
    ).to.be.revertedWithCustomError(agreementFactory, 'IncorrectCreationFee');
  });

  it('deploys with zero fee', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup();

    await (await feeManager.setCreationFee(0)).wait();
    await agreementFactory.createERC20({
      holders: [OWNER, HOLDER],
      unassignedRwaId: '',
    });
  });

  it('allow holder with 0 balance if it is admin', async () => {
    const initialSetup = await deployInitialSetup();
    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: true,
            balance: 0n,
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.not.be.reverted;

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: true,
            balance: 0n,
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.not.be.reverted;
  });

  it('revert when holder has 0 balance and is not admin', async () => {
    const initialSetup = await deployInitialSetup();
    await expect(
      deployAgreementERC20({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: false,
            balance: 0n,
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.be.reverted;

    await expect(
      deployAgreementERC1155({
        initialSetup,
        holders: [
          {
            account: initialSetup.defaultHolders[0].address,
            isAdmin: false,
            balance: 0n,
            wallet: initialSetup.defaultHolders[0],
          },
        ],
      }),
    ).to.be.reverted;
  });
});
