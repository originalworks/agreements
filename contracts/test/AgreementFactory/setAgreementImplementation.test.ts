import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployInitialSetup } from '../../helpers/deployments';
import { TokenStandard } from '../../helpers/types';

describe('AgreementFactory.setAgreementImplementation', () => {
  it('can change ERC20 implementation', async () => {
    const { agreementFactory, agreementERC20Implementation } =
      await deployInitialSetup();

    const Agreement = await ethers.getContractFactory('AgreementERC20');
    const anotherAgreementERC20Implementation = await Agreement.deploy();
    await anotherAgreementERC20Implementation.waitForDeployment();

    const implementationsBefore =
      await agreementFactory.getAgreementImplementations();

    expect(implementationsBefore['agreementERC20']).to.equal(
      await agreementERC20Implementation.getAddress(),
    );
    await agreementFactory.setAgreementImplementation(
      await anotherAgreementERC20Implementation.getAddress(),
      BigInt(TokenStandard.ERC20),
    );

    const implementationsAfter =
      await agreementFactory.getAgreementImplementations();
    expect(implementationsAfter['agreementERC20']).to.equal(
      await anotherAgreementERC20Implementation.getAddress(),
    );
  });
  it('can change ERC1155 implementation', async () => {
    const { agreementFactory, agreementERC1155Implementation } =
      await deployInitialSetup();

    const Agreement = await ethers.getContractFactory('AgreementERC1155');
    const anotherAgreementERC1155Implementation = await Agreement.deploy();
    await anotherAgreementERC1155Implementation.waitForDeployment();

    const implementationsBefore =
      await agreementFactory.getAgreementImplementations();

    expect(implementationsBefore['agreementERC1155']).to.equal(
      await agreementERC1155Implementation.getAddress(),
    );
    await agreementFactory.setAgreementImplementation(
      await anotherAgreementERC1155Implementation.getAddress(),
      BigInt(TokenStandard.ERC1155),
    );

    const implementationsAfter =
      await agreementFactory.getAgreementImplementations();
    expect(implementationsAfter['agreementERC1155']).to.equal(
      await anotherAgreementERC1155Implementation.getAddress(),
    );
  });
  it('emits an event on ERC20 implementation change', async () => {
    const { agreementFactory } = await deployInitialSetup();

    const Agreement = await ethers.getContractFactory('AgreementERC20');
    const anotherAgreementERC20Implementation = await Agreement.deploy();
    await anotherAgreementERC20Implementation.waitForDeployment();

    await expect(
      agreementFactory.setAgreementImplementation(
        await anotherAgreementERC20Implementation.getAddress(),
        BigInt(TokenStandard.ERC20),
      ),
    )
      .to.emit(agreementFactory, 'AgreementImplementationChanged')
      .withArgs(
        await anotherAgreementERC20Implementation.getAddress(),
        TokenStandard.ERC20,
      );
  });
  it('emits an event on ERC1155 implementation change', async () => {
    const { agreementFactory } = await deployInitialSetup();

    const Agreement = await ethers.getContractFactory('AgreementERC1155');
    const anotherAgreementERC1155Implementation = await Agreement.deploy();
    await anotherAgreementERC1155Implementation.waitForDeployment();

    await expect(
      agreementFactory.setAgreementImplementation(
        await anotherAgreementERC1155Implementation.getAddress(),
        BigInt(TokenStandard.ERC1155),
      ),
    )
      .to.emit(agreementFactory, 'AgreementImplementationChanged')
      .withArgs(
        await anotherAgreementERC1155Implementation.getAddress(),
        BigInt(TokenStandard.ERC1155),
      );
  });
  it('can only be called by the owner', async () => {
    const [, otherAccount] = await ethers.getSigners();

    const { agreementFactory } = await deployInitialSetup();
    const randomAddress = ethers.Wallet.createRandom().address;
    await expect(
      agreementFactory
        .connect(otherAccount)
        .setAgreementImplementation(randomAddress, BigInt(TokenStandard.ERC20)),
    ).to.be.revertedWithCustomError(
      agreementFactory,
      'OwnableUnauthorizedAccount',
    );
  });

  it('cannot be set to 0', async () => {
    const { agreementFactory } = await deployInitialSetup();

    await expect(
      agreementFactory.setAgreementImplementation(
        ethers.ZeroAddress,
        BigInt(TokenStandard.ERC20),
      ),
    ).to.be.revertedWith('AgreementFactory: agreement address cannot be 0');
  });

  it('cannot be set to a non-contract', async () => {
    const [, otherAccount] = await ethers.getSigners();

    const { agreementFactory } = await deployInitialSetup();

    await expect(
      agreementFactory.setAgreementImplementation(
        otherAccount.address,
        BigInt(TokenStandard.ERC20),
      ),
    ).to.be.revertedWith(
      'AgreementFactory: agreement implementation must be a contract',
    );
  });
});
