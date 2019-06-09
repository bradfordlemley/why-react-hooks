import React, {useEffect, useState, useRef} from 'react'
import {useGeoPosition} from 'the-platform'
import * as firebase from './firebase'

/* ISSUE: What is this doing?
After first render, add scroll listener which checks if container is scrolled to bottom.
After every render, ensures container is scrolled to bottom if it was at bottom
*/
function useStickyScrollContainer(
  scrollContainerRef,
  inputs = [],
) {
  // ISSUE: setStuck is used to cause a re-render, in order to (indirectly) re-run effects
  //  -- does every scroll cause a re-render?  no, every time scrollStuck changes.
  //     is it really necessary to re-render?
  const [isStuck, setStuck] = useState(true)
  useEffect(() => {
    function handleScroll() {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = scrollContainerRef.current
      const partialPixelBuffer = 10
      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer
      setStuck(!scrolledUp)
    }
    scrollContainerRef.current.addEventListener(
      'scroll',
      handleScroll,
    )
    return () =>
      scrollContainerRef.current.removeEventListener(
        'scroll',
        handleScroll,
      )
  }, [])

  // Sets scrollTop whenever scrollHeight or inputs change
  // -- in our case, inputs is the number of messages
  useEffect(() => {
    if (isStuck) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [
    scrollContainerRef.current
      ? scrollContainerRef.current.scrollHeight
      : 0,
    ...inputs,
  ])

  // ISSUE: not used
  return isStuck
}

function checkInView(
  element,
  container = element.parentElement,
) {
  const cTop = container.scrollTop
  const cBottom = cTop + container.clientHeight
  const eTop = element.offsetTop - container.offsetTop
  const eBottom = eTop + element.clientHeight
  const isTotal = eTop >= cTop && eBottom <= cBottom
  const isPartial =
    (eTop < cTop && eBottom > cTop) ||
    (eBottom > cBottom && eTop < cBottom)
  return isTotal || isPartial
}

function useVisibilityCounter(containerRef) {
  const [seenNodes, setSeenNodes] = useState([])

  useEffect(() => {
    const newVisibleChildren = Array.from(
      containerRef.current.children,
    )
      .filter(n => !seenNodes.includes(n))
      .filter(n => checkInView(n, containerRef.current))
    if (newVisibleChildren.length) {
      setSeenNodes(seen =>
        Array.from(
          new Set([...seen, ...newVisibleChildren]),
        ),
      )
    }
  })

  return seenNodes
}

function App() {
  const {
    coords: {latitude, longitude},
  } = useGeoPosition()
  const messagesContainerRef = useRef()
  const [messages, setMessages] = useState([])
  const [username, setUsername] = useState(() =>
    window.localStorage.getItem('geo-chat:username'),
  )
  useStickyScrollContainer(messagesContainerRef, [
    messages.length,
  ])
  const visibleNodes = useVisibilityCounter(
    messagesContainerRef,
  )
  const unreadCount = messages.length - visibleNodes.length

  function sendMessage(e) {
    e.preventDefault()
    firebase.addMessage({
      latitude,
      longitude,
      username: username || 'anonymous',
      content: e.target.elements.message.value,
    })
    e.target.elements.message.value = ''
    e.target.elements.message.focus()
  }

  useEffect(() => {
    const unsubscribe = firebase.subscribe(
      {latitude, longitude},
      messages => {
        setMessages(messages)
      },
    )
    return () => {
      unsubscribe()
    }
  }, [latitude, longitude])

  useEffect(() => {
    document.title = unreadCount
      ? `Unread: ${unreadCount}`
      : 'All read'
  }, [unreadCount])

  function handleUsernameChange(e) {
    const username = e.target.value
    setUsername(username)
    window.localStorage.setItem(
      'geo-chat:username',
      username,
    )
  }

  return (
    <div>
      <label htmlFor="username">Username</label>
      <input
        type="text"
        id="username"
        value={username}
        onChange={handleUsernameChange}
      />
      <form onSubmit={sendMessage}>
        <label htmlFor="message">Message</label>
        <input type="text" id="message" />
        <button type="submit">send</button>
      </form>
      <pre>
        {JSON.stringify({latitude, longitude}, null, 2)}
      </pre>
      <div
        id="messagesContainer"
        ref={messagesContainerRef}
        style={{
          border: '1px solid',
          height: 200,
          overflowY: 'scroll',
          padding: '10px 20px',
          borderRadius: 6,
        }}
      >
        {messages.map(message => (
          <div key={message.id}>
            <strong>{message.username}</strong>:{' '}
            {message.content}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
