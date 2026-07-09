import { create } from 'zustand'

export type AppStage = 'register' | 'import' | 'classify' | 'declare' | 'closing'

interface WorkbenchState {
  currentStage: AppStage
  currentTab: string
  setStage: (s: AppStage) => void
  setTab: (t: string) => void
  isClosing: boolean
  setClosing: (v: boolean) => void
}

const STAGE_ORDER: AppStage[] = ['register', 'import', 'classify', 'declare', 'closing']

export function getStageIndex(stage: AppStage): number {
  return STAGE_ORDER.indexOf(stage)
}

export function getStageLabel(stage: AppStage): string {
  const labels: Record<AppStage, string> = {
    register: '注册公司',
    import: '导入数据',
    classify: '分类确认',
    declare: '申报计算',
    closing: '结账销毁',
  }
  return labels[stage]
}

export function getStageDescription(stage: AppStage): string {
  const descs: Record<AppStage, string> = {
    register: '登记公司基本信息',
    import: '拖入银行流水、发票、工资表等',
    classify: '确认收入和支出分类是否正确',
    declare: '查看各税种计算结果并填报',
    closing: '完成申报后销毁本地数据',
  }
  return descs[stage]
}

export { STAGE_ORDER }

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  currentStage: 'register',
  currentTab: 'vat',
  isClosing: false,
  setStage: (s) => set({ currentStage: s }),
  setTab: (t) => set({ currentTab: t }),
  setClosing: (v) => set({ isClosing: v }),
}))
