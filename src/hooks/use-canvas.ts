'use client';

import { addArrow, addEllipse, addFrame, addFreeDrawShape, addLine, addRect, addText, clearSelection, removeShape, selectShape, setTool, Shape, updateShape } from "@/redux/slice/shapes"
import { panMove, Point, wheelZoom, wheelPan, screenToWorld, panStart, panEnd, handToolDisable, handToolEnable } from "@/redux/slice/viewport"
import { AppDispatch, useAppSelector } from "@/redux/store"
import { current } from "@reduxjs/toolkit";
import React, { useEffect, useRef, useState } from "react"
import { useDispatch } from "react-redux"

interface TouchPointer {
    id: number
    p: Point
}
const RAF_INTERVAL_MS = 8

interface DraftShape {
    type: 'frame' | 'rect' | 'ellipse' | 'arrow' | 'line'
    startWorld: Point
    currentWorld: Point
}

export const useInfinityCanvas = () => {
    const dispatch = useDispatch<AppDispatch>()
    const viewport = useAppSelector((s) => s.viewPort)
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

    const isErasingRef = useRef(false)
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
    const getLocalPointFromPt = (e: WithClientXY): Point => localPointFromClient(e.clientX, e.clientY)

    const getShapesAtPoint = (worldPoint: Point): Shape | null => {
        for(let i = shapeList.length - 1; i >= 0; i--) {
            const shape = shapeList[i]
            if(isPointInShape(worldPoint, shape)) {
                return shape
            }
        }
        return null
    }

    const isPointInShape = (point: Point, shape: Shape): boolean => {
        switch(shape.type) {
            case 'frame':
            case 'rect':
            case 'ellipse':
            case 'generatedui':
                return (
                    point.x >= shape.x &&
                    point.x <= shape.x + shape.w &&
                    point.y >= shape.y &&
                    point.y <= shape.y + shape.h
                )
            case 'freedraw':
                const threshold = 5
                for(let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i]
                    const p2 = shape.points[i + 1]
                    if(distanceToLineSegment(point, p1, p2) <= threshold) {
                        return true
                    }
                }
                return false

            case 'arrow':
            case 'line':
                const lineThreshold = 8
                return (
                    distanceToLineSegment(
                        point,
                        {x: shape.startX, y: shape.startY},
                        {x: shape.endX, y: shape.endY}
                    ) <= lineThreshold
                )
            case 'text':
                const textWidth = Math.max(
                    shape.text.length * (shape.fontSize * 0.6),
                    100
                )

                const textHeight = shape.fontSize * 1.2
                const padding = 8

                return (
                    point.x >= shape.x - 2 &&
                    point.x <= shape.x + textWidth + padding + 2 &&
                    point.y >= shape.y - 2 &&
                    point.y <= shape.y + textHeight + padding + 2
                )

            default:
                return false
        }
    }

    const distanceToLineSegment = (
        point: Point,
        lineStart: Point,
        lineEnd: Point
    ): number => {
        const A = point.x - lineStart.x
        const B = point.y - lineStart.y
        const C = lineEnd.x - lineStart.x
        const D = lineEnd.y - lineStart.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D

        let param = -1
        if(lenSq !== 0)
            param = dot / lenSq

        let xx, yy

        if(param < 0) {
            xx = lineStart.x
            yy = lineStart.y
        } else if (param > 1) {
            xx = lineEnd.x
            yy = lineEnd.y
        } else {
            xx = lineStart.x + param * C
            yy = lineStart.y + param * D
        }

        const dx = point.x - xx
        const dy = point.y - yy

        return Math.sqrt(dx * dx + dy * dy)
    }

    const schedulePanMove = (p: Point) => {
        pendingPanPointRef.current = p
        if(panRafRef.current != null)
            return
        panRafRef.current = window.requestAnimationFrame(() => {
            panRafRef.current = null
            const next = pendingPanPointRef.current
            if(next)
                dispatch(panMove(next))
        })
    }

    const freehandTick = (): void => {
        const now = performance.now()
        if(now - lastFreehandFrameRef.current >= RAF_INTERVAL_MS) {
            if(freeDrawPointsRef.current.length > 0)
                requestRender()
            lastFreehandFrameRef.current = now
        }

        if(isDrawingRef.current) {
            freehandRafRef.current = window.requestAnimationFrame(freehandTick)
        }
    }

    const onWheel = (e: WheelEvent) => {
       e.preventDefault()
       const originScreen = localPointFromClient(e.clientX, e.clientY)
       if(e.ctrlKey || e.metaKey) {
            dispatch(wheelZoom({deltaY: e.deltaY, originScreen}))
       }
       else {
        const dx = e.shiftKey ? e.deltaY : e.deltaX
        const dy = e.shiftKey ? 0 : e.deltaY
        dispatch(wheelPan({dx: -dx, dy: -dy}))
       }
    }

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement
        const isButton =
            target.tagName === 'BUTTON' ||
            target.closest('button') ||
            target.classList.contains('pointer-events-auto') ||
            target.closest('.pointer-events-auto')

        if(!isButton) {
            e.preventDefault()
        } else {
            console.log(
                'Not preventing default - clicked on interactive element:',
                target
            )
            return
        }

        const local = getLocalPointFromPt(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if(touchMapRef.current.size <= 1) {
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton = e.button === 1 || e.button === 2
            const panByShift = isSpacePressed.current && e.button === 0

            if(isPanButton || panByShift) {
                const mode = isSpacePressed.current ? 'shiftPanning' : 'panning'
                dispatch(panStart({screen: local, mode}))
                return
            }

            if(e.button === 0) {
                if(currentTool === 'select') {
                    const hitShape = getShapesAtPoint(world)

                    if(hitShape) {
                        const isAlreadySelected = selectedShapes[hitShape.id]
                        if(!isAlreadySelected) {
                            if(!e.shiftKey)
                                dispatch(clearSelection())
                            dispatch(selectShape(hitShape.id))
                        }
                        isMovingRef.current = true
                        moveStartRef.current = world

                        initialShapePositionsRef.current = {}
                        Object.keys(selectedShapes).forEach((id) => {
                            const shape = entityState.entities[id]
                            if(shape) {
                                if(
                                    shape.type === 'frame' ||
                                    shape.type === 'rect' ||
                                    shape.type === 'ellipse' ||
                                    shape.type === 'generatedui'
                                ) {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y
                                    }
                                } else if (shape.type === 'freedraw') {
                                    initialShapePositionsRef.current[id] = {
                                        points: [...shape.points],
                                    }
                                } else if (shape.type === 'arrow' || shape.type === 'line') {
                                    initialShapePositionsRef.current[id] = {
                                        startX: shape.startX,
                                        startY: shape.startY,
                                        endX: shape.endX,
                                        endY: shape.endY
                                    }
                                } else if (shape.type === 'text') {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y,
                                    }
                                }
                            }
                        })

                        if(
                            hitShape.type === 'frame' ||
                            hitShape.type === 'rect' ||
                            hitShape.type === 'ellipse' ||
                            hitShape.type === 'generatedui'
                        ) {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y,
                            }
                        } else if (hitShape.type === 'freedraw') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                points: [...hitShape.points],
                            }
                        } else if (hitShape.type === 'arrow' || hitShape.type === 'line') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                startX: hitShape.startX,
                                startY: hitShape.startY,
                                endX: hitShape.endX,
                                endY: hitShape.endY
                            }
                        } else if (hitShape.type === 'text') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y
                            }
                        }
                    } else {
                        if(!e.shiftKey) {
                            dispatch(clearSelection())
                            blurActiveTextInput()
                        }
                    }
                } else if (currentTool === 'eraser') {
                    isErasingRef.current = true
                    erasedShapesRef.current.clear()
                    const hitShape = getShapesAtPoint(world)
                    if(hitShape) {
                        dispatch(removeShape(hitShape.id))
                        erasedShapesRef.current.add(hitShape.id)
                    } else {
                        blurActiveTextInput()
                    }
                } else if (currentTool == 'text') {
                    dispatch(addText({x: world.x, y: world.y}))
                    dispatch(setTool('select'))
                } else {
                    isDrawingRef.current = true
                    if(
                        currentTool == 'frame' ||
                        currentTool == 'rect' ||
                        currentTool == 'ellipse' ||
                        currentTool == 'arrow' ||
                        currentTool == 'line'
                    ) {
                        console.log('Starting to draw:', currentTool, 'at:', world)
                        draftShapeRef.current = {
                            type: currentTool,
                            startWorld: world,
                            currentWorld: world,
                        }
                        requestRender()
                    } else if (currentTool == 'freedraw') {
                        freeDrawPointsRef.current = [world]
                        lastFreehandFrameRef.current = performance.now()
                        freehandRafRef.current = window.requestAnimationFrame(freehandTick)
                        requestRender()
                    }
                }
            }
        }
    }

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const local = getLocalPointFromPt(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        if(viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            schedulePanMove(local)
            return
        }
        if(isErasingRef.current && currentTool === 'eraser') {
            const hitShape = getShapesAtPoint(world)
            if(hitShape && !erasedShapesRef.current.has(hitShape.id)) {
                dispatch(removeShape(hitShape.id))
                erasedShapesRef.current.add(hitShape.id)
            }
        }

        if (
            isMovingRef.current &&
            moveStartRef.current &&
            currentTool === 'select'
        ) {
            const deltaX = world.x - moveStartRef.current.x
            const deltaY = world.y - moveStartRef.current.y

            Object.keys(initialShapePositionsRef.current).forEach((id) => {
                const initialPos = initialShapePositionsRef.current[id]
                const shape = entityState.entities[id]

                if(shape && initialPos) {
                    if(
                        shape.type === 'frame' ||
                        shape.type === 'rect' ||
                        shape.type === 'ellipse' ||
                        shape.type === 'text' ||
                        shape.type === 'generatedui'
                    ) {
                        if(
                            typeof initialPos.x === 'number' &&
                            typeof initialPos.y === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        x: initialPos.x + deltaX,
                                        y: initialPos.y + deltaY,
                                    },
                                })
                            )
                        }
                    }

                    else if (shape.type === 'freedraw') {
                        const initialPoints = initialPos.points
                        if(initialPoints) {
                            const newPoints = initialPoints.map((point) => ({
                                x: point.x + deltaX,
                                y: point.y + deltaY
                            }))
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        points: newPoints
                                    }
                                })
                            )
                        }
                    } else if (shape.type === 'arrow' || shape.type === 'line') {
                        if (
                            typeof initialPos.startX === 'number' &&
                            typeof initialPos.startY === 'number' &&
                            typeof initialPos.endX === 'number' &&
                            typeof initialPos.endY === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        startX: initialPos.startX + deltaX,
                                        startY: initialPos.startY + deltaY,
                                        endX: initialPos.endX + deltaX,
                                        endY: initialPos.endY + deltaY
                                    }
                                })
                            )
                        }
                    }
                }
            })
        }

        if(isDrawingRef.current) {
            if(draftShapeRef.current) {
                draftShapeRef.current.currentWorld = world
                requestRender()
            } else if (currentTool === 'freedraw') {
                freeDrawPointsRef.current.push(world)
            }
        }
    }

    const finalizeDrawing = (): void => {
        if(!isDrawingRef.current)
            return

        isDrawingRef.current = false

        if(freehandRafRef.current) {
            window.cancelAnimationFrame(freehandRafRef.current)
            freehandRafRef.current = null
        }

        const draft = draftShapeRef.current
        // const draft = draftShapeRef.current
        if(draft) {
            const x = Math.min(draft.startWorld.x, draft.startWorld.x)
            const y = Math.min(draft.startWorld.y, draft.startWorld.y)
            const w = Math.abs(draft.currentWorld.x - draft.startWorld.x)
            const h = Math.abs(draft.currentWorld.y - draft.startWorld.y)
            if(w > 1 && h > 1) {
                if(draft.type === 'frame') {
                    console.log('Adding frame shape:', {x, y, w, h})
                    dispatch(addFrame({x, y, w, h}))
                } else if (draft.type === 'rect') {
                    dispatch(addRect({x, y, w, h}))
                } else if (draft.type === 'ellipse') {
                    dispatch(addEllipse({x, y, w, h}))
                } else if (draft.type === 'arrow') {
                    dispatch(addArrow({
                        startX: draft.startWorld.x,
                        startY: draft.startWorld.y,
                        endX: draft.currentWorld.x,
                        endY: draft.currentWorld.y
                    })
                )
                } else if (draft.type === 'line') {
                    dispatch(addLine({
                        startX: draft.startWorld.x,
                        startY: draft.startWorld.y,
                        endX: draft.currentWorld.x,
                        endY: draft.currentWorld.y
                    })
                )
                }
            }
            draftShapeRef.current = null
        } else if (currentTool === 'freedraw') {
            const pts = freeDrawPointsRef.current
            if(pts.length > 1)
                dispatch(addFreeDrawShape({points: pts}))
            freeDrawPointsRef.current = []
        }

        requestRender()
    }

    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        canvasRef.current?.releasePointerCapture?.(e.pointerId)

        if(viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            dispatch(panEnd())
        }

        if(isMovingRef.current) {
            isMovingRef.current = false
            moveStartRef.current = null
            initialShapePositionsRef.current = {}
        }

        if(isErasingRef.current) {
            isErasingRef.current = false
            erasedShapesRef.current.clear()
        }

        finalizeDrawing()
    }

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        onPointerUp(e)
    }

    const onKeyDown = (e:KeyboardEvent): void => {
        if((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
            e.preventDefault()
            isSpacePressed.current = true
            dispatch(handToolEnable())
        }
    }

    const onKeyUp = (e: KeyboardEvent): void => {
        if(e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            e.preventDefault()
            isSpacePressed.current = false
            dispatch(handToolDisable())
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('keyup', onKeyUp)
            if(freehandRafRef.current)
                window.cancelAnimationFrame(freehandRafRef.current)
            if(panRafRef.current)
                window.cancelAnimationFrame(panRafRef.current)
        }
    }, [])


}