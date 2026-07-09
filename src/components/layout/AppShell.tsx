import { useCompanyStore } from '../../stores/company'
import { useImportStore } from '../../stores/import'
import { Header } from './Header'
import { CompanyWizard } from '../company/CompanyWizard'
import { ImportPanel } from '../import/ImportPanel'
import { ClassifyPanel } from '../classify/ClassifyPanel'
import { Workbench } from '../workbench/Workbench'

export function AppShell() {
  const isRegistered = useCompanyStore(s => s.isRegistered)
  const isImportComplete = useImportStore(s => s.isImportComplete)

  return (
    <div className="min-h-screen bg-white text-slate-700 font-sans">
      <Header />
      <main className="max-w-screen-2xl mx-auto">
        {!isRegistered ? (
          <CompanyWizard />
        ) : (
          <div className="flex flex-col">
            <ImportPanel />
            {isImportComplete && <ClassifyPanel />}
            {isImportComplete && (
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-2/5 border-r border-slate-200">
                  <Workbench.LeftPanel />
                </div>
                <div className="lg:w-3/5">
                  <Workbench.RightPanel />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
