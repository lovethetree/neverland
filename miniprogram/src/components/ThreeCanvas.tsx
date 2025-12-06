import React, { useEffect, useRef, useState } from 'react'
import { Canvas, CoverView, View } from '@tarojs/components'
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
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    // Audio Init
    const bgm = Taro.createInnerAudioContext()
    bgm.src = 'assets/audio/bgm.mp3'
    bgm.loop = true
    bgm.autoplay = true
    bgm.volume = 0.3
    
    // Some devices require explicit play after context creation or user interaction
    bgm.play()
    
    bgm.onPlay(() => {
      console.log('BGM Started')
      setIsPlaying(true)
    })
    bgm.onPause(() => {
      console.log('BGM Paused')
      setIsPlaying(false)
    })
    bgm.onError((res) => {
      console.error('BGM Error', res)
    })

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
    
    // Resume audio on interaction if it was auto-blocked
    if (audioCtxRef.current && audioCtxRef.current.paused && isPlaying) {
        // If logic thinks it should be playing but it's paused (e.g. system interruption or auto-block), try play
        audioCtxRef.current.play()
    }
  }
  const onTouchMove = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
  }
  const onTouchEnd = (e) => {
    if (platformRef.current) platformRef.current.dispatchTouchEvent(e)
  }

  const toggleMusic = (e) => {
    e.stopPropagation() // Prevent canvas touch
    if (audioCtxRef.current) {
      if (isPlaying) {
        audioCtxRef.current.pause()
      } else {
        audioCtxRef.current.play()
      }
    }
  }

  return (
    <View style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#001100' }}>
      <Canvas
        type="webgl"
        id="three-canvas"
        canvasId="three-canvas"
        style={{ width: '100%', height: '100%', display: 'block' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      
      {/* UI Overlay using CoverView for Native Component compatibility */}
      
      {/* Top Left: Title */}
      <CoverView style={{ position: 'absolute', top: '60px', left: '20px', pointerEvents: 'none' }}>
        <CoverView style={{ color: '#D4AF37', fontSize: '18px', fontWeight: 'bold' }}>MERRY CHRISTMAS</CoverView>
        <CoverView style={{ color: 'rgba(212, 175, 55, 0.6)', fontSize: '12px', marginTop: '4px' }}>Xuexue Christmas Tree</CoverView>
        <CoverView style={{ width: '40px', height: '1px', backgroundColor: 'rgba(212, 175, 55, 0.3)', marginTop: '8px' }}></CoverView>
      </CoverView>

      {/* Top Right: Music Control */}
      <CoverView 
        style={{ 
          position: 'absolute', 
          top: '60px', 
          right: '20px', 
          border: '1px solid rgba(212, 175, 55, 0.5)', 
          borderRadius: '15px', 
          padding: '4px 12px', 
          backgroundColor: 'rgba(0,0,0,0.2)',
          zIndex: 9999
        }}
        onClick={toggleMusic}
      >
        <CoverView style={{ color: '#D4AF37', fontSize: '10px' }}>
          {isPlaying ? 'MUSIC ON' : 'MUSIC OFF'}
        </CoverView>
      </CoverView>

      {/* Bottom Right: Footer */}
      <CoverView style={{ position: 'absolute', bottom: '30px', right: '20px', pointerEvents: 'none' }}>
          <CoverView style={{ color: 'rgba(212, 175, 55, 0.4)', fontSize: '10px' }}>Jessie L. Edition-2025</CoverView>
      </CoverView>

    </View>
  )
}
