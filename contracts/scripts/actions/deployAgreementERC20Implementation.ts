import { ethers } from 'hardhat';
import { AgreementERC20, AgreementERC20__factory } from '../../typechain';

export async function deployAgreementERC20Implementation(): Promise<{
  agreementERC20Implementation: AgreementERC20;
  AgreementERC20Factory: AgreementERC20__factory;
}> {
  const AgreementERC20Factory =
    await ethers.getContractFactory('AgreementERC20');
  const agreementERC20Implementation = await AgreementERC20Factory.deploy();
  await agreementERC20Implementation.waitForDeployment();
  return { agreementERC20Implementation, AgreementERC20Factory };
}
