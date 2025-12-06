import React, { useEffect, useRef } from 'react'
import { Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { WechatPlatform } from 'three-platformize/src/WechatPlatform'
import * as THREE from 'three-platformize'
import { ChristmasTreeScene } from '../scene/ChristmasTreeScene'

export default function ThreeCanvas() {
  const platformRef = useRef<WechatPlatform | null>(null)
  const sceneRef = useRef<ChristmasTreeScene | null>(null)

  useEffect(() => {
    const query = Taro.createSelectorQuery()
    query.select('#three-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return

        const canvas = res[0].node
        const width = res[0].width
        const height = res[0].height

        const platform = new WechatPlatform(canvas, width, height)
        platformRef.current = platform
        THREE.PLATFORM.set(platform)

        // Initialize Scene
        sceneRef.current = new ChristmasTreeScene(canvas, width, height)
      })

    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose()
      }
    }
  }, [])

  const onTouchStart = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
  }
  const onTouchMove = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
  }
  const onTouchEnd = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
  }

  return (
    <Canvas
      type="webgl"
      id="three-canvas"
      canvasId="three-canvas"
      style={{ width: '100%', height: '100%' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  )
}
