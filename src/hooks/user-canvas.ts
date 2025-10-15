import { Shape } from "@/redux/slice/shapes"
import { Point } from "@/redux/slice/viewport"
import { AppDispatch, useAppSelector } from "@/redux/store"
import { useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"

interface TouchPointer {
    id: number
    p: Point
}

interface DraftShape {
    type: 'frame' | 'rect' | 'ellipse' | 'arrow' | 'line'
    startWorld: Point
    currentWorld: Point
}

export const useInfinityCanvas = () => {
    const dispatch = useDispatch<AppDispatch>()
    const viewport = useAppSelector((s) => s.viewPort())
    const entityState = useAppSelector((s) => s.shapes.shapes)

    const shapeList: Shape[] = entityState.ids
        .map((id: string) => entityState.entities[id])
        .filter((s: Shape | undefined): s is Shape => Boolean(s))

    const currentTool = useAppSelector((s) => s.shapes.tool)
    const selectedShapes = useAppSelector((s) => s.shapes.selected)

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const shapesEntities = useAppSelector((state) => state.shapes.shapes.entities)

    const hasSelectedText = Object.keys(selectedShapes).some((id) => {
        const shape = shapesEntities[id]
        return shape?.type === 'text'
    })

    useEffect(() => {
        if(hasSelectedText && !isSidebarOpen) {
            setIsSidebarOpen(true)
        } else if (!hasSelectedText) {
            setIsSidebarOpen(false)
        }
    }, [hasSelectedText, isSidebarOpen])

    const canvasRef = useRef<HTMLDivElement | null>(null)
    const touchMapRef = useRef<Map<number, TouchPointer>>(new Map())

    const draftShapeRef = useRef<DraftShape | null>(null)
    const freeDrawPointsRef = useRef<Point[]>([])
    const isSpacePressed = useRef(false)
    const isDrawingRef = useRef(false)
    const isMovingRef = useRef(false)
    const moveStartRef = useRef<Point | null>(null)

    const initialShapePositionsRef = useRef<
        Record<
            string,
            {
                x?: number
                y?: number
                points?: Point[]
                startX?: number
                startY?: number
                endX?: number
                endY?: number
            }
        >
    >({})

    const isErasing = useRef(false)
    const erasedShapesRef = useRef<Set<string>>(new Set())
    const isResizingRef = useRef(false)
    const resizeDatRef = useRef<{
        shapeId: string
        corner: string
        initialBounds: {x: number; y: number; w: number; h: number}
        startPoint: {x:number, y:number}
    } | null>(null)

    const lastFreehandFrameRef = useRef(0)
    const freehandRafRef = useRef<number | null>(null)
    const panRafRef = useRef<number | null>(null)
    const pendingPanPointRef = useRef<Point | null>(null)

    const [, force] = useState(0)
    const requestRender = (): void => {
        force((n) => (n + 1) | 0)
    }

    const localPointFromClient = (clientX: number, clientY: number): Point => {
        const el = canvasRef.current
        if(!el)
            return {x: clientX, y: clientY}
        const r = el.getBoundingClientRect()
        return {x: clientX - r.left, y: clientY - r.top}
    }

    const blurActiveTextInput = () => {
        const activeElement = document.activeElement
        if(activeElement && activeElement.tagName === 'INPUT') {
            ;(activeElement as HTMLInputElement).blur()
        }
    }

    type WithClientXY = {clientX: number; clientY: number}


}