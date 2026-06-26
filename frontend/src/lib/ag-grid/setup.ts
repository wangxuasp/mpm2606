'use client'

import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale'
import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community'
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise'

const licenseKey = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY
if (licenseKey) {
  LicenseManager.setLicenseKey(licenseKey)
}

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

provideGlobalGridOptions({
  localeText: AG_GRID_LOCALE_CN,
})

export { AG_GRID_LOCALE_CN }
