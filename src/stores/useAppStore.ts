import { create } from 'zustand'
import { Template, Workflow, Client, Integration, Deployment } from '@/types'

interface AppState {
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Selected items
  selectedTemplate: Template | null
  setSelectedTemplate: (template: Template | null) => void

  selectedWorkflow: Workflow | null
  setSelectedWorkflow: (workflow: Workflow | null) => void

  selectedClient: Client | null
  setSelectedClient: (client: Client | null) => void

  selectedIntegration: Integration | null
  setSelectedIntegration: (integration: Integration | null) => void

  selectedDeployment: Deployment | null
  setSelectedDeployment: (deployment: Deployment | null) => void

  // Modal states
  modals: {
    createTemplate: boolean
    createWorkflow: boolean
    createClient: boolean
    createIntegration: boolean
    createDeployment: boolean
    settings: boolean
  }
  openModal: (modal: keyof AppState['modals']) => void
  closeModal: (modal: keyof AppState['modals']) => void
  closeAllModals: () => void

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Notifications
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
  }>
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void
  removeNotification: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Selected items
  selectedTemplate: null,
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  selectedWorkflow: null,
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

  selectedClient: null,
  setSelectedClient: (client) => set({ selectedClient: client }),

  selectedIntegration: null,
  setSelectedIntegration: (integration) => set({ selectedIntegration: integration }),

  selectedDeployment: null,
  setSelectedDeployment: (deployment) => set({ selectedDeployment: deployment }),

  // Modals
  modals: {
    createTemplate: false,
    createWorkflow: false,
    createClient: false,
    createIntegration: false,
    createDeployment: false,
    settings: false,
  },
  openModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),
  closeModal: (modal) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),
  closeAllModals: () =>
    set({
      modals: {
        createTemplate: false,
        createWorkflow: false,
        createClient: false,
        createIntegration: false,
        createDeployment: false,
        settings: false,
      },
    }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Notifications
  notifications: [],
  addNotification: (type, message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now().toString(), type, message },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
