import { ContractFactory } from 'ethers'
import { ERC1967Proxy__factory } from '../typechain'

/**
 * Helper for deploying proxy contracts as with `upgrades` package.
 * Return type is inferred from the factory & initialize args are typechecked.
 * Works only for initializers with name `initialize`.
 *
 * @example
 *
 * const market = await deployProxy(
 *    new Market__factory(deployerWallet),
 *    [feeReceiverAddress, revCreditsAddress, ...]
 * )
 */

export const deployProxy = async <Factory extends ContractFactory>(
  implementationFactory: Factory,
  initializeArgs: Parameters<
    Awaited<ReturnType<Factory['deploy']>>['populateTransaction']['initialize']
  >,
) => {
  const signer = implementationFactory.signer
  const ERC1967Proxy = new ERC1967Proxy__factory(signer)

  const implementation = await implementationFactory.deploy()
  const implementationData = await implementation.populateTransaction[
    'initialize'
  ](...initializeArgs)

  const proxy = await ERC1967Proxy.deploy(
    implementation.address,
    implementationData.data as any,
  )

  const contract = implementationFactory.attach(proxy.address) as Awaited<
    ReturnType<Factory['deploy']>
  >

  return contract
}
