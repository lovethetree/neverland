import React, { useEffect, useRef } from 'react'
import { Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { WechatPlatform } from 'three-platformize/src/WechatPlatform'
import * as THREE from 'three-platformize'
import { ChristmasTreeScene } from '../scene/ChristmasTreeScene'
import { useStore } from '../store'

export default function ThreeCanvas() {
  const platformRef = useRef<WechatPlatform | null>(null)
  const sceneRef = useRef<ChristmasTreeScene | null>(null)
  const audioCtxRef = useRef<Taro.InnerAudioContext | null>(null)
  const lastToggleTime = useRef(0)

  useEffect(() => {
    // Audio Init
    const bgm = Taro.createInnerAudioContext()
    bgm.src = 'assets/audio/bgm.mp3'
    bgm.loop = true
    bgm.autoplay = true
    bgm.volume = 0.3
    bgm.play()
    audioCtxRef.current = bgm

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
      if (audioCtxRef.current) {
        audioCtxRef.current.stop()
        audioCtxRef.current.destroy()
      }
    }
  }, [])

  const onTouchStart = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
    
    // 3-finger toggle
    if (e.touches && e.touches.length === 3) {
      const now = Date.now()
      if (now - lastToggleTime.current > 1000) {
        useStore.getState().toggleMode()
        lastToggleTime.current = now
        Taro.showToast({ title: 'Switching Mode', icon: 'none' })
      }
    }
    
    // Resume audio on interaction
    if (audioCtxRef.current && audioCtxRef.current.paused) {
      audioCtxRef.current.play()
    }
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
