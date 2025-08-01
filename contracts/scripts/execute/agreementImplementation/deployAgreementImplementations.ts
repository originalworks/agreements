import { deployAgreementERC20Implementation } from '../../actions/deployAgreementERC20Implementation';
import { deployAgreementERC1155Implementation } from '../../actions/deployAgreementERC1155Implementation';

async function main() {
  console.log('deploying new ERC1155 implementation...');
  const { agreementERC1155Implementation } =
    await deployAgreementERC1155Implementation();
  console.log(
    'new ERC1155 implementation:',
    await agreementERC1155Implementation.getAddress(),
  );

  console.log('deploying new ERC20 implementation...');
  const { agreementERC20Implementation } =
    await deployAgreementERC20Implementation();
  console.log(
    'new ERC20 implementation:',
    await agreementERC20Implementation.getAddress(),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
