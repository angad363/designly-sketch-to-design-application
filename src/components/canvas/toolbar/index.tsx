import React from 'react'
import HistoryPill from './history'

const Toolbar = () => {
  return (
    <div className='fixed bottom-0 w-full grid grid-cols-3 z-50 p-5'>
        <HistoryPill />
    </div>
  )
}

export default Toolbar