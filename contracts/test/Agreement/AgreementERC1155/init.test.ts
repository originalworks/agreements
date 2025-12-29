import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments';
import { getEvent } from '../../helpers/utils';
import { TokenStandard } from '../../helpers/types';

describe('AgreementERC1155.initialize', () => {
  const CONTRACT_URI = 'contract_uri';
  const TOKEN_URI = `ipfs://${'ab'.repeat(32)}`;
  const TOKEN_ID = 1;
  it('should initialize values properly', async () => {
    const [, holder1Account, holder2Account] = await ethers.getSigners();
    const holder1Balance = 600n;
    const holder2Balance = 400n;
    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC1155({
      contractUri: CONTRACT_URI,
      tokenUri: TOKEN_URI,
      initialSetup,
      holders: [
        {
          account: holder1Account.address,
          balance: holder1Balance,
          isAdmin: true,
          wallet: holder1Account,
        },
        {
          account: holder2Account.address,
          balance: holder2Balance,
          isAdmin: false,
          wallet: holder2Account,
        },
      ],
    });
    expect(await agreement.uri(1)).to.equal(TOKEN_URI);
    expect(await agreement.contractURI()).to.equal(CONTRACT_URI);
    expect(await agreement.totalSupply()).to.equal(1000);
    expect(
      await agreement.balanceOf(holder1Account.address, TOKEN_ID),
    ).to.equal(600);
    expect(
      await agreement.balanceOf(holder2Account.address, TOKEN_ID),
    ).to.equal(400);
    expect(await agreement.isAdmin(holder1Account.address)).to.equal(true);
    expect(await agreement.isAdmin(holder2Account.address)).to.equal(false);
  });
  it('emits events', async () => {
    const Agreement = await ethers.getContractFactory('AgreementERC1155');
    const [, holder1Account] = await ethers.getSigners();
    const holder1Balance = 600;
    const unassignedRwaId = 'ABC123';

    const { agreementFactory, feeManager } = await deployInitialSetup();

    const createTx = agreementFactory.createERC1155(
      {
        tokenUri: 'tokenUri',
        contractURI: 'contractURI',
        holders: [
          {
            account: holder1Account.address,
            balance: holder1Balance.toString(),
            isAdmin: true,
          },
        ],
        unassignedRwaId,
      },

      { value: await feeManager.creationFee() },
    );

    const event = await getEvent(
      createTx,
      agreementFactory,
      'AgreementCreated',
    );

    const agreementAddress = event.args[0];
    const tokenStandard = event.args[1];
    const rwaId = event.args[2];

    const agreement = Agreement.attach(agreementAddress);

    expect(tokenStandard).to.equal(TokenStandard.ERC1155);
    expect(rwaId).equal(`UNKNOWN:${unassignedRwaId}`);

    await expect(Promise.resolve(createTx))
      .to.emit(agreement, 'AdminAdded')
      .withArgs(holder1Account.address);
  });

  it('cannot be called twice', async () => {
    const initialSetup = await deployInitialSetup();
    const { agreement } = await deployAgreementERC1155({
      initialSetup,
      shares: [1000n],
    });
    const {
      feeManager,
      defaultHolders,
      agreementRelationsRegistry,
      currencyManager,
      fallbackVault,
      namespaceRegistry,
    } = initialSetup;
    await expect(
      agreement.initialize({
        tokenUri: TOKEN_URI,
        contractUri: CONTRACT_URI,
        holders: [
          { account: defaultHolders[0].address, balance: 100n, isAdmin: true },
        ],
        currencyManager: await currencyManager.getAddress(),
        feeManager: await feeManager.getAddress(),
        agreementRelationsRegistry:
          await agreementRelationsRegistry.getAddress(),
        fallbackVault: await fallbackVault.getAddress(),
        namespaceRegistry: await namespaceRegistry.getAddress(),
        rwaId: 'REVELATOR:ABC123',
      }),
    ).to.be.reverted;
  });

  it('fails when there are no holders', async () => {
    const { agreementFactory, feeManager } = await deployInitialSetup();

    await expect(
      agreementFactory.createERC1155(
        {
          tokenUri: TOKEN_URI,
          holders: [],
          contractURI: CONTRACT_URI,
          unassignedRwaId: 'ABC123',
        },
        {
          value: await feeManager.creationFee(),
        },
      ),
    ).to.be.revertedWith('AgreementERC1155: No holders');
  });

  it('fails if first holder is not an admin', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup();

    await expect(
      agreementFactory.createERC1155(
        {
          tokenUri: TOKEN_URI,
          holders: [
            {
              account: defaultHolders[0].address,
              balance: 600n,
              isAdmin: false,
            },
            {
              account: defaultHolders[1].address,
              balance: 400n,
              isAdmin: false,
            },
          ],
          contractURI: CONTRACT_URI,
          unassignedRwaId: 'ABC123',
        },
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC1155: First holder must be admin');
  });

  it('fails if holders balance is zero', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup();

    await expect(
      agreementFactory.createERC1155(
        {
          tokenUri: TOKEN_URI,
          contractURI: CONTRACT_URI,
          unassignedRwaId: 'ABC123',
          holders: [
            {
              account: defaultHolders[0].address,
              balance: 600n,
              isAdmin: true,
            },
            { account: defaultHolders[1].address, balance: 0n, isAdmin: false },
          ],
        },
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC1155: Holder balance is zero');
  });

  it('fails if the a holder has a zero address', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup();

    await expect(
      agreementFactory.createERC1155(
        {
          tokenUri: TOKEN_URI,
          contractURI: CONTRACT_URI,
          unassignedRwaId: 'ABC123',
          holders: [
            {
              account: defaultHolders[0].address,
              balance: 600n,
              isAdmin: true,
            },
            {
              account: ethers.ZeroAddress,
              balance: 400,
              isAdmin: false,
            },
          ],
        },
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC1155: Holder account is zero');
  });

  it('fails if any of the holders is duplicated', async () => {
    const { agreementFactory, feeManager, defaultHolders } =
      await deployInitialSetup();

    await expect(
      agreementFactory.createERC1155(
        {
          tokenUri: TOKEN_URI,
          contractURI: CONTRACT_URI,
          unassignedRwaId: 'ABC123',
          holders: [
            {
              account: defaultHolders[0].address,
              balance: 600n,
              isAdmin: true,
            },
            {
              account: defaultHolders[0].address,
              balance: 400n,
              isAdmin: false,
            },
          ],
        },
        { value: await feeManager.creationFee() },
      ),
    ).to.be.revertedWith('AgreementERC1155: Duplicate holder');
  });
});
