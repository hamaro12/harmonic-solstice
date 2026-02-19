import React, { useState, useEffect } from 'react';
import { Plus, X, Layout } from 'lucide-react';
import StoryBoard from './components/StoryBoard';

export default function App() {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  // 초기 탭 로드 (Legacy Support included)
  useEffect(() => {
    const savedTabs = localStorage.getItem('webnovel_session_tabs');
    if (savedTabs) {
      const parsed = JSON.parse(savedTabs);
      setTabs(parsed);
      if (parsed.length > 0) {
        setActiveTabId(parsed[0].id);
      }
    } else {
      // 기존 데이터가 있다면 Default 탭으로 연결, 없어도 Default 탭 생성
      const defaultTab = {
        id: 'default',
        title: '웹소설 스토리 아키텍처',
        storagePrefix: 'webnovel_' // 기존 로컬스토리지 키 접두사와 일치 ('webnovel_story_columns' 등)
      };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    }
  }, []);

  // 탭 상태 저장
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('webnovel_session_tabs', JSON.stringify(tabs));
    }
  }, [tabs]);

  const addTab = () => {
    const newId = `p${Date.now()}`;
    const newTab = {
      id: newId,
      title: '새 프로젝트',
      storagePrefix: `webnovel_${newId}_`
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (e, tabId) => {
    e.stopPropagation();

    // 마지막 탭은 닫지 않거나, 닫으면 새 탭 생성? 여기서는 마지막 탭 닫으면 빈 상태보다는 새 탭 생성 유도 or 유지
    if (tabs.length === 1) {
      if (window.confirm('마지막 탭입니다. 초기화하고 새 프로젝트를 시작하시겠습니까?')) {
        // 데이터 초기화 로직은 복잡하므로 여기서는 단순히 탭 목록만 리셋하고 스토리보드 내부에서 새 프로젝트 로직 이용 유도
        // 하지만 UX상 탭을 닫는 느낌을 주기 위해... 
        // 일단 마지막 탭 삭제 방지
        alert('최소 하나의 탭이 필요합니다.');
        return;
      }
      return;
    }

    if (window.confirm('탭을 닫으시겠습니까? 저장되지 않은 변경사항은 삭제될 수 있습니다. (안전하게 저장 후 닫기를 권장합니다)')) {
      const newTabs = tabs.filter(t => t.id !== tabId);
      setTabs(newTabs);

      if (activeTabId === tabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }

      // Optional: Cleanup localStorage data for this tabId to prevent garbage accumulation
      // const targetPrefix = tabs.find(t => t.id === tabId)?.storagePrefix;
      // if (targetPrefix && targetPrefix !== 'webnovel_') { // Don't delete legacy default
      //   // Clean up known keys... 
      // }
    }
  };

  const updateTabMeta = (tabId, title, subtitle) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        // 제목이 바뀌었을 때만 업데이트하여 불필요한 리렌더링 방지
        if (tab.title !== title) {
          return { ...tab, title: title || '제목 없음' };
        }
      }
      return tab;
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-200 font-sans overflow-hidden">
      {/* App Header / Tab Bar */}
      <div className="flex items-center bg-neutral-800 text-white px-2 pt-1.5 gap-1 overflow-x-auto flex-shrink-0 select-none">
        <div className="flex items-center px-4 py-2 font-bold text-neutral-400 gap-2">
          <Layout size={18} />
          <span className="hidden sm:inline text-xs tracking-wider">HARMONIC</span>
        </div>

        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                group relative flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all min-w-[120px] max-w-[200px]
                ${isActive
                  ? 'bg-neutral-100 text-neutral-900 shadow-sm z-10'
                  : 'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                }
              `}
            >
              <span className="text-xs font-medium truncate flex-1">{tab.title}</span>
              <button
                onClick={(e) => closeTab(e, tab.id)}
                className={`
                  p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
                  ${isActive ? 'hover:bg-neutral-200 text-neutral-500' : 'hover:bg-neutral-600 text-neutral-400'}
                `}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          onClick={addTab}
          className="ml-1 p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
          title="새 탭 열기"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {tabs.map(tab => (
          <StoryBoard
            key={tab.id}
            isActive={tab.id === activeTabId}
            storagePrefix={tab.storagePrefix}
            onUpdateMeta={(title, subtitle) => updateTabMeta(tab.id, title, subtitle)}
          />
        ))}
        {tabs.length === 0 && (
          <div className="flex items-center justify-center h-full text-neutral-400">
            탭을 추가하여 새 프로젝트를 시작하세요.
          </div>
        )}
      </div>
    </div>
  );
}
