import { Tabs, TabsList } from '@/components/ui/tabs'
import { TabsTrigger } from '@radix-ui/react-tabs'
import { Hash, LayoutIcon, Type } from 'lucide-react'
import React from 'react'

type Props = {
  children: React.ReactNode
}

const tabs = [
  {
    value: 'colours',
    label: 'Colours',
    icon: Hash
  },
  {
    value: 'typography',
    label: 'Typography',
    icon: Type
  },
  {
    value: 'moodboard',
    label: 'Moodboard',
    icon: LayoutIcon
  }
] as const

const Layout = ({children}: Props) => {
  return <Tabs
    defaultValue='colours'
    className='w-full'
  >
    <div className='mt-36 container mx-auto px-4 sm:px-6 py-6 sm:py-8'>
      <div>
        <div className='flex flex-col lg:flex-row gap-4 lg:gap-5 items-center justify-between'>
          <div>
            <h1 className='text-3xl lg:text-left text-center font-bold text-foreground'>
              Style Guide
            </h1>
            <p className='text-muted-foreground mt-2 text-center lg:text-left'>
              Manage your style guide for your project.
            </p>
          </div>
          <TabsList className='inline-flex w-auto h-auto gap-1 rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] p-1'>
  {tabs.map((tab) => {
    const Icon = tab.icon
    return (
      <TabsTrigger
        key={tab.value}
        value={tab.value}
        className='flex items-center gap-2 px-4 py-2 rounded-full data-[state=active]:bg-white/[0.15] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-white/[0.2] transition-all duration-200 text-sm text-white/60 data-[state=active]:text-white font-medium'
      >
        <Icon className='w-4 h-4' />
        <span>{tab.label}</span>
      </TabsTrigger>
    )
  })}
</TabsList>
        </div>
      </div>
    </div>
    <div className='container mx-auto px-4 sm:px-6 py-6 sm:py-6'>
            {children}
    </div>
  </Tabs>
}

export default Layout