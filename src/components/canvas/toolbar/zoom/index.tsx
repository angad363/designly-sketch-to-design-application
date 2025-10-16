'use client';

import { Button } from '@/components/ui/button'
import { useInfinityCanvas } from '@/hooks/use-canvas'
import { setScale } from '@/redux/slice/viewport'
import { Viewport } from '@radix-ui/react-navigation-menu'
import { ZoomOut } from 'lucide-react'
import React from 'react'

type Props = {}

const ZoomBar = (props: Props) => {

    const {viewport, dispatch} = useInfinityCanvas()


    // TODO: Add zoom in and zoom out
    // const handleZoomOut = () => {
    //     const newScale = Math.max(Viewport.scale / 1.2, Viewport.minScale)
    //     dispatch(setScale({scale: newScale}))
    // }

    return (
        <div className='col-span-1 flex justify-end items-center'>
            <div className='flex items-center gap-1 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-3 saturate-150'>
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleZoomOut}
                    className='w-9 h-9 rounded-full cursor-pointer hover:bg-white/[0.12] border border-transparent hover:border-white/[0.16] transition-all'
                    title='Zoom Out'
                >
                    <ZoomOut className='w-4 h-4 text-primary/50' />
                </Button>
            </div>
        </div>
    )
}

export default ZoomBar