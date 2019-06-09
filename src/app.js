import React, {useEffect, useState, useRef} from 'react'
// import {useGeoPosition} from 'the-platform'
// import * as firebase from './firebase'
import { createStatedLib } from '@stated-library/base';
import { mapState } from '@stated-library/core';
import { use } from '@stated-library/react';
import createMsgLib from './MsgLib';

const createStickyScrollerLib = (initialElement) => createStatedLib(
  {},
  base => {
    let element;
    let isStuck = false;
  
    function handleScroll() {
      const {
        clientHeight,
        scrollTop,
        scrollHeight,
      } = element;

      const partialPixelBuffer = 10;

      const scrolledUp =
        clientHeight + scrollTop <
        scrollHeight - partialPixelBuffer

      isStuck = !scrolledUp;
    }
  
    function setElement(el) {
      console.log('setting element: ', el)
      if (el !== element) {
        console.log('got diff element: ', el)
        element && element.removeEventListener('scroll', handleScroll);
        element = el;
        element && element.addEventListener('scroll', handleScroll);
      }
    }

    function autoscroll() {
      if (isStuck) {
        element.scrollTop = element.scrollHeight;
      }
    }
  
    setElement(initialElement);
    base.onUnsubscribe && base.onUnsubscribe(() => {
      setElement();
    });

    return {
      setElement,
      autoscroll,
    }
  }
);


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

const createVisCounterLib = initialElement => createStatedLib(
  { seenNodes: [] },
  base => {
    let element = initialElement;

    function update() {
      console.log('updating visible')
      const newVisibleChildren = Array.from(
        element.children,
      )
        .filter(n => !base.state.seenNodes.includes(n))
        .filter(n => checkInView(n, element))
      if (newVisibleChildren.length) {
        base.updateState({
          seenNodes: Array.from(
            new Set([...base.state.seenNodes, ...newVisibleChildren])
          ),
        })
      }
    }

    function handleScroll() {
      update();
    }

    function setElement(el) {
      if (el !== element) {
        element && element.removeEventListener('scroll', handleScroll);
        element = el;
        element && element.addEventListener('scroll', handleScroll);
        update();
      }
    }

    setElement(initialElement);
    base.onUnsubscribe && base.onUnsubscribe(() => {
      setElement();
    });
    
    return {
      setElement,
      update,
    }
  }
)

function App() {
  const messagesContainerRef = useRef();
  const { addMessage, latitude, longitude, messages, setUsername, username } = 
    use(() => {
      const lib = createMsgLib();
      return mapState(
        lib.state$,
        state => ({
          ...state,
          addMessage: lib.addMessage,
          setUsername: lib.setUsername,
        })
      )
    });

  const { autoscroll, setElement } = use(() => {
    const lib = createStickyScrollerLib(messagesContainerRef.current);
    return mapState(
      lib.state$,
      state => ({
        ...state,
        autoscroll: lib.autoscroll,
        setElement: lib.setElement,
      })
    );
  });

  const { seenNodes, setElement: setVisElement, update } = use(() => {
    const lib = createVisCounterLib(messagesContainerRef.current);
    return mapState(
      lib.state$,
      state => ({
        ...state,
        setElement: lib.setElement,
        update: lib.update,
      })
    )
  });

  useEffect(() => {
    setElement(messagesContainerRef.current);
    setVisElement(messagesContainerRef.current);
  }, [messagesContainerRef.current]);

  useEffect(() => {
    update();
  })

  useEffect(() => {
    autoscroll();
  }, [
    messagesContainerRef.current
      ? messagesContainerRef.current.scrollHeight
      : 0,
    messages.length
  ]);

  const unreadCount = messages.length - seenNodes.length;

  useEffect(() => {
    document.title = unreadCount
      ? `Unread: ${unreadCount}`
      : 'All read'
  }, [unreadCount])

  return (
    <div>
      <label htmlFor="username">Username</label>
      <input
        type="text"
        id="username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <form onSubmit={(e) => {
        e.preventDefault();
        addMessage(e.target.elements.message.value);
        e.target.elements.message.value = '';
        e.target.elements.message.focus();
      }}>
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
