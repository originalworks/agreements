import fs from 'fs'
import { getImplementationAddressFromProxy } from '@openzeppelin/upgrades-core'
import { ethers } from 'hardhat'
import { deploySplitCurrencies } from '../../actions/deploySplitCurrencies'
import { DeploymentOutput, SplitCurrency } from '../../types'
import {
  SPLIT_CURRENCIES_DEFINITIONS,
  PREDEFINED_SPLIT_CURRENCIES,
} from './constants'

function getDeploymentFileName() {
  const network = process.env.HARDHAT_NETWORK || 'unknown'
  const date = new Date(Date.now())
  const month =
    date.getMonth() + 1 > 9 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`
  const day = date.getDate() > 9 ? date.getDate() : `0${date.getDate()}`
  const hour = date.getHours() > 9 ? date.getHours() : `0${date.getHours()}`
  const minute =
    date.getMinutes() > 9 ? date.getMinutes() : `0${date.getMinutes()}`
  const second =
    date.getSeconds() > 9 ? date.getSeconds() : `0${date.getSeconds()}`
  const dateString = `${date.getFullYear()}-${month}-${day}_${hour}:${minute}:${second}`
  return `${network}__${dateString}.json`
}

export async function prepareSplitCurrencies(deployNewCurrencies: boolean) {
  let splitCurrencies: SplitCurrency[] = []

  if (deployNewCurrencies) {
    console.log('deploying split currencies...')
    splitCurrencies = await deploySplitCurrencies(SPLIT_CURRENCIES_DEFINITIONS)
  } else {
    splitCurrencies = PREDEFINED_SPLIT_CURRENCIES
  }

  const nonLendingERC20SplitCurrencies = splitCurrencies.reduce<string[]>(
    (all, current) => {
      if (!current.lendingCurrency && !current.nativeCoin) {
        all.push(current.address)
      }
      return all
    },
    [],
  )

  const lendingToken = splitCurrencies.find(
    (currency) => currency.lendingCurrency === true,
  )

  if (!lendingToken) {
    throw new Error("Couldn't find lending token")
  }

  return { splitCurrencies, nonLendingERC20SplitCurrencies, lendingToken }
}

export async function saveDeploymentData(input: DeploymentOutput) {
  const deployment = {
    ...input,
    feeManagerImplementation: await getImplementationAddressFromProxy(
      ethers.provider,
      input.feeManager,
    ),
    agreementFactoryImplementation: await getImplementationAddressFromProxy(
      ethers.provider,
      input.agreementFactory,
    ),
    fallbackVaultImplementation: await getImplementationAddressFromProxy(
      ethers.provider,
      input.fallbackVault,
    ),
    splitCurrencies: input.splitCurrencies.map((currency) => ({
      name: currency.name,
      symbol: currency.symbol,
      decimals: currency.decimals,
      lendingCurrency: currency.lendingCurrency,
      nativeCoin: currency.nativeCoin,
      address: currency.address,
    })),
  }
  const deploymentFileName = getDeploymentFileName()
  fs.writeFileSync(
    `./deployments/${deploymentFileName}`,
    JSON.stringify(deployment, null, 2),
  )
}
