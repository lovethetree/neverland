import React from 'react'
import { View, Text, Button } from '@tarojs/components'
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { useStore } from '../../store'
import ThreeCanvas from '../../components/ThreeCanvas'
import './index.scss'

export default function Index() {
  const isFormed = useStore((state) => state.isFormed)
  const toggleFormed = useStore((state) => state.toggleFormed)

  useShareAppMessage(() => {
    return {
      title: 'Merry Christmas! 🎄',
      path: '/pages/index/index',
      imageUrl: '' // Optional: Add a screenshot if available
    }
  })

  useShareTimeline(() => {
    return {
      title: 'Merry Christmas! 🎄',
      query: '',
      imageUrl: ''
    }
  })

  return (
    <View className="index">
      <ThreeCanvas />
      
      {/* UI Overlay */}
      <View className="ui-container">
        <View className="header">
          <Text className="title">Merry Christmas</Text>
          <Text className="subtitle">Christmas Tree</Text>
        </View>

        <View className="controls">
          <Button 
            className={`toggle-btn ${isFormed ? 'active' : ''}`}
            onClick={toggleFormed}
          >
            {isFormed ? '🎄 Reset Chaos' : '✨ Form Tree'}
          </Button>
        </View>
        
        <View className="footer">
           <Text className="footer-text">Jessie L Edition·2025</Text>
        </View>
      </View>
    </View>
  )
}
