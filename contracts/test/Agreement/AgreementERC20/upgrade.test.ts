import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'
import { buildHolders } from '../../helpers/utils'
import { deployInitialSetupLegacy } from '../../helpers/legacyDeployment'

describe('AgreementERC20 upgrades', () => {
  describe('Agreement.upgrade', () => {
    it('can change the executed code', async () => {
      const initialSetup = await deployInitialSetup()
      const { agreement, holders } = await deployAgreementERC20({
        initialSetup,
        shares: [1000],
      })
      const admin = holders[0]
      const AgreementUpgrade = await ethers.getContractFactory(
        'AgreementERC20Upgrade',
      )
      const agreementUpgrade = await AgreementUpgrade.deploy()

      await agreement.connect(admin.wallet).upgrade(agreementUpgrade.address)

      const upgradedAgreement = AgreementUpgrade.attach(agreement.address)
      await upgradedAgreement.setNewParameter(1234)

      expect(await upgradedAgreement.newParameter()).to.equal(1234)
      expect(agreement.address).to.equal(upgradedAgreement.address)
    })

    it('can only be called by the admin', async () => {
      const [, , , notAdmin] = await ethers.getSigners()
      const initialSetup = await deployInitialSetup()
      const { agreement } = await deployAgreementERC20({
        initialSetup,
        shares: [1000],
      })
      const AgreementUpgrade = await ethers.getContractFactory(
        'AgreementERC20Upgrade',
      )
      const agreementUpgrade = await AgreementUpgrade.deploy()

      await expect(
        agreement.connect(notAdmin).upgrade(agreementUpgrade.address),
      ).to.be.revertedWith('AgreementERC20: Sender must be an admin')
    })
  })
  describe('upgrade AgreementERC20 from V1 to current version', () => {
    const DATA_HASH = `0x${'ab'.repeat(32)}`
    it('should upgrade agreement contracts', async () => {
      const initialSetup = await deployInitialSetupLegacy()
      const AgreementV1 = await ethers.getContractFactory('AgreementERC20V1')
      const AgreementV2 = await ethers.getContractFactory('AgreementERC20V2')
      const AgreementV3 = await ethers.getContractFactory('AgreementERC20V3')
      const AgreementV4 = await ethers.getContractFactory('AgreementERC20V4')
      const AgreementV5 = await ethers.getContractFactory('AgreementERC20V5')
      const AgreementV6 = await ethers.getContractFactory('AgreementERC20V6')
      const AgreementV7 = await ethers.getContractFactory('AgreementERC20V7')
      const AgreementV8 = await ethers.getContractFactory('AgreementERC20V8')
      const AgreementV9 = await ethers.getContractFactory('AgreementERC20V9')
      const AgreementV10 = await ethers.getContractFactory('AgreementERC20V10')
      const AgreementCurrent = await ethers.getContractFactory('AgreementERC20')

      const holders = buildHolders(initialSetup.defaultHolders, [1000])

      const agreementContract = await upgrades.deployProxy(AgreementV1, [
        DATA_HASH,
        holders,
        initialSetup.splitCurrencyListManager.address,
        initialSetup.feeManager.address,
        initialSetup.lendingContract.address,
        initialSetup.agreementRelationsRegistry.address,
        initialSetup.fallbackVault.address,
      ])

      await agreementContract.deployed()

      await upgrades.validateUpgrade(AgreementV1, AgreementV2)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV2)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV2, AgreementV3)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV3)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV3, AgreementV4)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV4)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV4, AgreementV5)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV5)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV5, AgreementV6)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV6)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV6, AgreementV7)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV7)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV7, AgreementV8)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV8)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV8, AgreementV9)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV9)).not.to
        .be.reverted

      await upgrades.validateUpgrade(AgreementV9, AgreementV10)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementV10)).not
        .to.be.reverted

      await upgrades.validateUpgrade(AgreementV10, AgreementCurrent)
      await expect(upgrades.upgradeProxy(agreementContract, AgreementCurrent))
        .not.to.be.reverted
    })
  })
})
