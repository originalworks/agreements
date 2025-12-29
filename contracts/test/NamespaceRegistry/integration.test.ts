import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../helpers/deployments';

describe('NamespaceRegistry integration test', function () {
  describe('AgreementFactory', () => {
    it('Can create agreement without rwaId (split agreements)', async function () {
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        unassignedRwaId: '',
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.rwaId()).to.equal('REVELATOR:');
    });
    it('Create agreement in namespace based on minter address', async function () {
      const unassignedRwaId = '123ABC';
      const namespace = 'REVELATOR';
      const [, minterWallet] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();
      await initialSetup.namespaceRegistry.setNamespaceForAddresses(
        [minterWallet.address],
        [namespace],
      );

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        unassignedRwaId,
        txExecutorWallet: minterWallet,
      });

      expect(await agreement.agreement.rwaId()).equal(
        `${namespace}:${unassignedRwaId}`,
      );
    });
    it('Set UNKNOWN namespace if minter is not registered', async () => {
      const unassignedRwaId = '123ABC';
      const [, unregisteredMinter] = await ethers.getSigners();
      const initialSetup = await deployInitialSetup();

      const agreement = await deployAgreementERC1155({
        initialSetup,
        shares: [100n],
        unassignedRwaId,
        txExecutorWallet: unregisteredMinter,
      });

      expect(await agreement.agreement.rwaId()).equal(
        `UNKNOWN:${unassignedRwaId}`,
      );
    });
  });
});
