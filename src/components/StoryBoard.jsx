import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, GripVertical, Edit2, Trash2, X, ChevronUp, ChevronDown, Save, Link, Unlink, Settings, Filter, Check, Focus, Search, Tag, FilePlus, FolderOpen, Download, Sparkles, ZoomIn, ZoomOut, RotateCcw, CheckSquare, Square, StickyNote } from 'lucide-react';

// --- 초기 데이터 설정 ---
const INITIAL_COLUMNS = [
  { id: 'c1', title: '발단 (Introduction)' },
  { id: 'c2', title: '전개 (Development)' },
  { id: 'c3', title: '위기 (Crisis)' },
  { id: 'c4', title: '절정 (Climax)' },
  { id: 'c5', title: '결말 (Resolution)' }
];

const BLOCK_TYPES = {
  main: { label: '메인 플롯', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  sub: { label: '서브 플롯', color: 'bg-green-100 text-green-800 border-green-300' },
  character: { label: '인물 서사', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  foreshadow: { label: '떡밥/회수', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  setting: { label: '세계관/설정', color: 'bg-slate-100 text-slate-800 border-slate-300' }
};

const INITIAL_BLOCKS = [
  { id: 'b1', columnId: 'c1', type: 'main', title: '주인공 등장', description: '평범하거나 불행한 주인공의 현재 상황 묘사.', order: 0, tags: ['주인공', '발단'] },
  { id: 'b2', columnId: 'c1', type: 'setting', title: '세계관 설정', description: '게이트, 아카데미, 혹은 무림 등 배경 설명.', order: 1, tags: ['배경', '설정'] },
  { id: 'b3', columnId: 'c2', type: 'main', title: '특별한 계기 (기연)', description: '회귀, 빙의, 혹은 상태창 각성 등 사건 발생.', order: 0, tags: ['각성', '전개'] },
  { id: 'b4', columnId: 'c2', type: 'foreshadow', title: '의문의 조력자/적', description: '주인공을 지켜보는 정체불명의 인물 등장.', order: 1, tags: ['떡밥', '미스터리'] },
  { id: 'b5', columnId: 'c3', type: 'main', title: '첫 번째 위기', description: '라이벌의 등장 혹은 강력한 몬스터와의 조우.', order: 0, tags: ['위기', '전투'] },
  { id: 'b6', columnId: 'c4', type: 'main', title: '위기 극복 및 보상', description: '압도적인 능력으로 위기를 극복하고 보상을 획득.', order: 0, tags: ['사이다', '성장'] },
  { id: 'b7', columnId: 'c4', type: 'foreshadow', title: '정체불명 인물의 정체', description: '앞서 등장한 인물이 아군 혹은 흑막임이 밝혀짐.', order: 1, tags: ['반전', '회수'] },
  { id: 'b8', columnId: 'c5', type: 'main', title: '새로운 챕터', description: '더 넓은 세상으로 나아가는 주인공.', order: 0, tags: ['결말', '새출발'] },
];

const DEFAULT_RELATION_TYPES = {
  flow: { label: '단순 흐름', color: '#94a3b8' },
  causality: { label: '인과 관계', color: '#f43f5e' },
  foreshadow: { label: '떡밥 회수', color: '#f59e0b' },
  character: { label: '인물 관계', color: '#a855f7' }
};

const INITIAL_CONNECTIONS = [
  { id: 'conn1', source: 'b1', target: 'b3', type: 'causality' },
  { id: 'conn2', source: 'b4', target: 'b7', type: 'foreshadow' },
];

export default function StoryBoard({ isActive, storagePrefix, onUpdateMeta }) {
  const [columns, setColumns] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [relationTypes, setRelationTypes] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [editingRelations, setEditingRelations] = useState({});
  const [editingBlock, setEditingBlock] = useState(null);
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [linkingSource, setLinkingSource] = useState(null);
  const [linkingType, setLinkingType] = useState('flow');
  const [lines, setLines] = useState([]);
  const [hiddenRelationTypes, setHiddenRelationTypes] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // AI 생성 모달 상태
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetColumnId, setAiTargetColumnId] = useState(null);
  const [aiInputText, setAiInputText] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiModel, setAiModel] = useState('gemini-3-flash-preview'); // Default model

  useEffect(() => {
    const savedKey = localStorage.getItem('webnovel_gemini_api_key');
    if (savedKey) setUserApiKey(savedKey);

    const savedModel = localStorage.getItem('webnovel_gemini_model');
    const validModels = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-3.1-pro-preview'];

    if (savedModel && validModels.includes(savedModel)) {
      setAiModel(savedModel);
    } else {
      setAiModel('gemini-3-flash-preview'); // 강제 리셋
    }
  }, []);

  const saveApiKey = (key) => {
    setUserApiKey(key);
    localStorage.setItem('webnovel_gemini_api_key', key);
  };

  const saveAiModel = (model) => {
    setAiModel(model);
    localStorage.setItem('webnovel_gemini_model', model);
  };

  // 검색 및 태그 상태 추가
  const [searchQuery, setSearchQuery] = useState('');
  const [tagInput, setTagInput] = useState('');

  // 노트(메모) 상태 추가
  const [notes, setNotes] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  // 메인 타이틀 상태 추가
  const [boardTitle, setBoardTitle] = useState('웹소설 스토리 아키텍처');
  const [boardSubtitle, setBoardSubtitle] = useState('드래그 앤 드롭으로 플롯과 모듈을 시각적으로 기획하세요.');

  // 새로 추가된 상태: 강조(집중) 모드
  const [highlightedRelationType, setHighlightedRelationType] = useState(null);

  // 줌 레벨 상태
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setZoomLevel(1);

  // 다중 선택 및 일괄 태그 추가 상태
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState([]);

  const [batchTagInput, setBatchTagInput] = useState('');

  // AI 실험실 상태
  const [isExperimentMode, setIsExperimentMode] = useState(false);
  const [originalState, setOriginalState] = useState(null); // { blocks, connections, columns }
  const [previewState, setPreviewState] = useState(null); // { blocks, connections, columns }
  const [experimentDiff, setExperimentDiff] = useState(null); // { added: [], deleted: [], modified: [] }
  const [viewMode, setViewMode] = useState('modified'); // 'original' | 'modified'
  const [isAiExperimentModalOpen, setIsAiExperimentModalOpen] = useState(false);
  const [experimentPrompt, setExperimentPrompt] = useState('');

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedBlockIds([]); // 모드 전환 시 선택 초기화
    setBatchTagInput('');
    setLinkingSource(null); // 연결 모드 해제
  };

  const handleBatchAddTag = () => {
    if (!batchTagInput.trim()) return;
    if (selectedBlockIds.length === 0) {
      alert("선택된 블록이 없습니다.");
      return;
    }

    const newTag = batchTagInput.trim();
    setBlocks(blocks.map(block => {
      if (selectedBlockIds.includes(block.id)) {
        // 중복 태그 방지
        const updatedTags = block.tags && block.tags.includes(newTag)
          ? block.tags
          : [...(block.tags || []), newTag];
        return { ...block, tags: updatedTags };
      }
      return block;
    }));

    setBatchTagInput('');
    // alert(`${selectedBlockIds.length}개 블록에 #${newTag} 태그가 추가되었습니다.`);
    // 선택 모드 유지 또는 해제? 사용성 고려하여 유지.
  };

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleNewProject = () => {
    if (window.confirm('새 프로젝트를 시작하시겠습니까? 저장하지 않은 내용은 사라집니다.')) {
      setColumns(INITIAL_COLUMNS);
      setBlocks(INITIAL_BLOCKS); // 초기 템플릿으로 리셋
      setConnections(INITIAL_CONNECTIONS);
      setRelationTypes(DEFAULT_RELATION_TYPES);
      setBoardTitle('새 프로젝트');
      setBoardSubtitle('새로운 스토리 기획');
    }
  };

  const handleSaveProject = () => {
    const data = {
      columns,
      blocks,
      connections,
      relationTypes,
      boardTitle,
      boardSubtitle,
      notes,
      savedAt: new Date().toISOString()
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.columns) setColumns(data.columns);
        if (data.blocks) setBlocks(data.blocks);
        if (data.connections) setConnections(data.connections);
        if (data.relationTypes) setRelationTypes(data.relationTypes);
        if (data.boardTitle) setBoardTitle(data.boardTitle);
        if (data.boardSubtitle) setBoardSubtitle(data.boardSubtitle);
        if (data.notes) setNotes(data.notes);
      } catch (err) {
        alert('파일을 불러오는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset val
  };

  // 로컬 스토리지에서 데이터 불러오기
  useEffect(() => {
    if (!storagePrefix) return;
    const savedCols = localStorage.getItem(`${storagePrefix}story_columns`);
    const savedBlocks = localStorage.getItem(`${storagePrefix}story_blocks`);
    const savedConns = localStorage.getItem(`${storagePrefix}story_connections`);
    const savedRels = localStorage.getItem(`${storagePrefix}relation_types`);
    const savedTitle = localStorage.getItem(`${storagePrefix}board_title`);
    const savedSubtitle = localStorage.getItem(`${storagePrefix}board_subtitle`);
    const savedNotes = localStorage.getItem(`${storagePrefix}notes`);

    if (savedCols) setColumns(JSON.parse(savedCols));
    else setColumns(INITIAL_COLUMNS);

    if (savedBlocks) setBlocks(JSON.parse(savedBlocks));
    else setBlocks(INITIAL_BLOCKS);

    if (savedConns) setConnections(JSON.parse(savedConns));
    else setConnections(INITIAL_CONNECTIONS);

    if (savedRels) {
      const parsedRels = JSON.parse(savedRels);
      setRelationTypes(Object.keys(parsedRels).length > 0 ? parsedRels : DEFAULT_RELATION_TYPES);
    } else {
      setRelationTypes(DEFAULT_RELATION_TYPES);
    }

    if (savedTitle !== null) setBoardTitle(savedTitle);
    if (savedSubtitle !== null) setBoardSubtitle(savedSubtitle);
    if (savedNotes !== null) setNotes(savedNotes);
  }, []);

  // 변경사항 자동 저장
  useEffect(() => {
    if (!storagePrefix) return;
    if (columns.length > 0) {
      localStorage.setItem(`${storagePrefix}story_columns`, JSON.stringify(columns));
    }
    if (blocks.length > 0) {
      localStorage.setItem(`${storagePrefix}story_blocks`, JSON.stringify(blocks));
    }
    localStorage.setItem(`${storagePrefix}story_connections`, JSON.stringify(connections));
    if (Object.keys(relationTypes).length > 0) {
      localStorage.setItem(`${storagePrefix}relation_types`, JSON.stringify(relationTypes));
    }
    localStorage.setItem(`${storagePrefix}board_title`, boardTitle);
    localStorage.setItem(`${storagePrefix}board_subtitle`, boardSubtitle);
    localStorage.setItem(`${storagePrefix}notes`, notes);
  }, [columns, blocks, connections, relationTypes, boardTitle, boardSubtitle, notes, storagePrefix]);

  // 상위 컴포넌트에 메타데이터 업데이트 알림
  useEffect(() => {
    if (onUpdateMeta) {
      onUpdateMeta(boardTitle, boardSubtitle);
    }
  }, [boardTitle, boardSubtitle, onUpdateMeta]);

  // 강조된 관계에 포함된 블록 ID들을 추출
  const connectedBlockIds = useMemo(() => {
    if (!highlightedRelationType) return null;
    const ids = new Set();
    connections.forEach(c => {
      const typeKey = relationTypes[c.type] ? c.type : Object.keys(relationTypes)[0];
      if (typeKey === highlightedRelationType) {
        ids.add(c.source);
        ids.add(c.target);
      }
    });
    return ids;
  }, [connections, highlightedRelationType, relationTypes]);

  // --- 관계선 그리기 로직 ---
  const drawLines = useCallback(() => {
    if (!boardRef.current) return;
    const board = boardRef.current;
    // 보드 컨테이너 내부의 실제 콘텐츠 영역 (Zoom이 적용된 div)을 기준으로 좌표 계산
    const innerContent = board.firstElementChild;
    if (!innerContent) return;
    const innerRect = innerContent.getBoundingClientRect();

    const newLines = connections.map(conn => {
      const srcEl = document.getElementById(`block-${conn.source}`);
      const tgtEl = document.getElementById(`block-${conn.target}`);
      if (!srcEl || !tgtEl) return null;

      const srcRect = srcEl.getBoundingClientRect();
      const tgtRect = tgtEl.getBoundingClientRect();

      // Inner Content 기준 상대 좌표 계산 + Zoom Level 보정
      // getBoundingClientRect는 화면상 보이는 크기(Zoom 적용됨)를 반환하므로,
      // 좌표 차이를 zoomLevel로 나누어야 실제 내부 좌표계에서의 위치가 나옴.

      const x1 = (srcRect.left - innerRect.left) / zoomLevel + (srcRect.width / zoomLevel); // Source 우측 중앙
      const y1 = (srcRect.top - innerRect.top) / zoomLevel + (srcRect.height / zoomLevel) / 2;

      const x2 = (tgtRect.left - innerRect.left) / zoomLevel; // Target 좌측 중앙
      const y2 = (tgtRect.top - innerRect.top) / zoomLevel + (tgtRect.height / zoomLevel) / 2;

      // 곡선 (Bezier Curve)
      const offset = Math.abs(x2 - x1) * 0.5;
      const path = `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;

      const typeKey = relationTypes[conn.type] ? conn.type : Object.keys(relationTypes)[0];
      const relType = relationTypes[typeKey] || DEFAULT_RELATION_TYPES.flow;

      return { id: conn.id, path, color: relType.color, type: typeKey };
    }).filter(Boolean);

    setLines(newLines);
  }, [connections, relationTypes, zoomLevel]);

  // 블록 위치가 변경되거나 화면이 리사이즈될 때 선 다시 그리기
  useEffect(() => {
    drawLines();
    window.addEventListener('resize', drawLines);
    return () => window.removeEventListener('resize', drawLines);
  }, [drawLines, blocks]);

  // 블록 추가/수정 모달 열기
  const openModal = (block = null, targetColumnId = 'c1') => {
    setTagInput(''); // 태그 입력창 초기화
    if (block) {
      setEditingBlock(block);
    } else {
      setEditingBlock({
        id: `b${Date.now()}`,
        columnId: targetColumnId,
        type: 'main',
        title: '',
        description: '',
        order: blocks.filter(b => b.columnId === targetColumnId).length,
        tags: [] // 새 블록 태그 초기화
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  const saveBlock = (e) => {
    e.preventDefault();
    if (blocks.find(b => b.id === editingBlock.id)) {
      setBlocks(blocks.map(b => b.id === editingBlock.id ? editingBlock : b));
    } else {
      setBlocks([...blocks, editingBlock]);
    }
    closeModal();
  };

  const deleteBlock = (id) => {
    setConfirmDialog({
      isOpen: true,
      message: '이 스토리 블록을 삭제하시겠습니까?',
      onConfirm: () => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        setConnections(prev => prev.filter(c => c.source !== id && c.target !== id));
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  const handleAddColumn = () => {
    const newId = `c_${Date.now()}`;
    setColumns([...columns, { id: newId, title: '새로운 단계' }]);
  };

  const requestDeleteColumn = (colId) => {
    setConfirmDialog({
      isOpen: true,
      message: '이 단계를 삭제하시겠습니까? 내부의 모든 스토리 블록도 함께 삭제됩니다.',
      onConfirm: () => {
        setColumns(prev => prev.filter(c => c.id !== colId));
        const deletedBlockIds = blocks.filter(b => b.columnId === colId).map(b => b.id);
        setBlocks(prev => prev.filter(b => b.columnId !== colId));
        setConnections(prev => prev.filter(c => !deletedBlockIds.includes(c.source) && !deletedBlockIds.includes(c.target)));
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  // --- AI 블록 생성 로직 ---
  const openAiModal = (columnId) => {
    setAiTargetColumnId(columnId);
    setAiInputText('');
    setIsAiModalOpen(true);
  };

  const handleAiGeneration = async () => {
    if (!aiInputText.trim()) return;
    if (!userApiKey.trim()) {
      alert("Google Gemini API Key를 입력해주세요.");
      return;
    }

    setIsAiLoading(true);

    try {
      const prompt = `
        Analyze the following story text and break it down into a JSON array of story blocks.
        The output must be a valid JSON array of objects. Do not wrap in markdown code blocks.
        
        Each object should have:
        - title: string (max 20 chars, summary of the event)
        - description: string (detailed summary of the event)
        - type: string (one of: 'main', 'sub', 'character', 'foreshadow', 'setting')
        - tags: array of strings (keywords related to the event)

        Story Text:
        ${aiInputText}
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${userApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      let generatedText = data.candidates[0].content.parts[0].text;

      // Markdown code block removal if present
      generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedBlocks = JSON.parse(generatedText);

      if (!Array.isArray(parsedBlocks)) {
        throw new Error("Invalid format received from AI");
      }

      const newBlocks = parsedBlocks.map((block, index) => ({
        id: `b${Date.now()}_${index}`,
        columnId: aiTargetColumnId,
        type: block.type || 'main',
        title: block.title || 'Untitled',
        description: block.description || '',
        order: blocks.filter(b => b.columnId === aiTargetColumnId).length + index,
        tags: block.tags || []
      }));

      setBlocks([...blocks, ...newBlocks]);
      setIsAiModalOpen(false);
      setAiInputText('');
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert(`AI 블록 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- AI 실험실 로직 ---
  const handleAiExperiment = async () => {
    if (!experimentPrompt.trim()) return;
    if (!userApiKey.trim()) {
      alert("Google Gemini API Key를 입력해주세요.");
      return;
    }

    setIsAiLoading(true);

    try {
      // 현재 상태 저장
      const currentOriginalState = {
        blocks: JSON.parse(JSON.stringify(blocks)),
        connections: JSON.parse(JSON.stringify(connections)),
        columns: JSON.parse(JSON.stringify(columns))
      };
      const prompt = `
        You are a professional story editor.
        Analyze the current story structure (JSON) and the user's request.
        Modify the story blocks and connections to satisfy the user's request.
        
        User Request: "${experimentPrompt}"

        Return a JSON object containing ONLY the changes (Partial Update).
        The JSON object must have the following structure:
        {
          "added": [ ...array of NEW block objects... ],
          "modified": [ ...array of MODIFIED block objects... ],
          "deleted": [ ...array of IDs of deleted blocks... ],
          "connections": [ ...array of ALL valid connection objects (REPLACE existing connections)... ]
        }
        
        Rules:
        1. 'added': New blocks to insert. Ensure unique IDs (e.g., "new_timestamp_index").
        2. 'modified': Blocks to update. specific IDs must match existing blocks. Include ALL fields for the modified block, not just changed fields.
        3. 'deleted': IDs of blocks to remove.
        4. 'connections': 
           - **Connections are OPTIONAL**. 
           - Do NOT add, remove, or modify connections unless the user requests it.
           - If a block is deleted, you MUST remove its associated connections.
           - If there are NO changes to connections, OMIT this field from the JSON response.
           - If there ARE changes (including adding the first connection), return the COMPLETE list of all connections (both existing and new).
           - Connection Object Format: { "source": "source_block_id", "target": "target_block_id", "type": "relation_type_key" }
        5. 'connections.type': Use one of the following types based on the relationship:
           ${Object.entries(relationTypes).map(([key, val]) => `- "${key}": ${val.label}`).join('\n           ')}
        
        Current Story Data:
        ${JSON.stringify({ columns, blocks, connections }, null, 2)}

        Project Notes (Context):
        "${notes || "No notes available."}"
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${userApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const generatedText = data.candidates[0].content.parts[0].text;

      // Extract JSON from text (find first { and last })
      const jsonStartIndex = generatedText.indexOf('{');
      const jsonEndIndex = generatedText.lastIndexOf('}');

      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("AI did not return a valid JSON object.");
      }

      const jsonString = generatedText.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsedData = JSON.parse(jsonString);

      // Validate structure
      if (!parsedData.added && !parsedData.modified && !parsedData.deleted && !parsedData.connections) {
        throw new Error("Invalid format: JSON must contain added, modified, deleted, or connections");
      }

      const addedBlocks = parsedData.added || [];
      const modifiedBlocks = parsedData.modified || [];
      const deletedBlockIds = parsedData.deleted || [];
      // Use existing connections if not provided by AI
      const newConnections = parsedData.connections || currentOriginalState.connections;

      // Merge Changes
      let newBlocks = [...currentOriginalState.blocks];

      // 1. Delete
      if (deletedBlockIds.length > 0) {
        newBlocks = newBlocks.filter(b => !deletedBlockIds.includes(b.id));
      }

      // 2. Modify
      modifiedBlocks.forEach(modBlock => {
        const index = newBlocks.findIndex(b => b.id === modBlock.id);
        if (index !== -1) {
          newBlocks[index] = { ...newBlocks[index], ...modBlock };
        }
      });

      // 3. Add
      // Ensure added blocks have valid properties
      const validAddedBlocks = addedBlocks.map((b, i) => ({
        ...b,
        id: b.id || `b${Date.now()}_ai_${i}`, // Fallback ID if missing
        columnId: b.columnId || currentOriginalState.columns[0].id // Fallback column if missing
      }));
      newBlocks = [...newBlocks, ...validAddedBlocks];

      // Calculate Diff for highlighting
      const addedIds = validAddedBlocks.map(b => b.id);
      const modifiedIds = modifiedBlocks.map(b => b.id);
      const deletedIds = deletedBlockIds;

      setExperimentDiff({ added: addedIds, deleted: deletedIds, modified: modifiedIds });

      // Set Experiment State
      setOriginalState(currentOriginalState);
      setPreviewState({
        blocks: newBlocks,
        connections: newConnections,
        columns: currentOriginalState.columns
      });

      // Apply Preview automatically
      setBlocks(newBlocks);
      setConnections(newConnections);

      setIsExperimentMode(true);
      setViewMode('modified');
      setIsAiExperimentModalOpen(false);
      setExperimentPrompt('');

    } catch (error) {
      console.error("AI Experiment Error:", error);

      let errorMessage = error.message;
      const errorLower = errorMessage.toLowerCase();

      if (errorLower.includes("503") || errorLower.includes("high demand") || errorLower.includes("overloaded")) {
        errorMessage = "AI 모델 사용량이 많아 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.";
      }

      // JSON 오류는 원래 메시지(내용 일부 포함됨) 그대로 출력

      alert(`AI 실험 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyExperiment = () => {
    // Commit changes: just clear experiment state
    setIsExperimentMode(false);
    setOriginalState(null);
    setPreviewState(null);
    setExperimentDiff(null);
  };

  const discardExperiment = () => {
    // Revert changes
    if (originalState) {
      setBlocks(originalState.blocks);
      setConnections(originalState.connections);
      setColumns(originalState.columns);
    }
    setIsExperimentMode(false);
    setOriginalState(null);
    setPreviewState(null);
    setExperimentDiff(null);
  };

  const togglePreviewMode = (mode) => {
    setViewMode(mode);
    if (mode === 'original' && originalState) {
      setBlocks(originalState.blocks);
      setConnections(originalState.connections);
    } else if (mode === 'modified' && previewState) {
      setBlocks(previewState.blocks);
      setConnections(previewState.connections);
    }
  };

  // --- 링크 연결  및 다중 선택 로직 ---
  const handleBlockClick = (blockId) => {
    if (isSelectionMode) {
      setSelectedBlockIds(prev => {
        if (prev.includes(blockId)) {
          return prev.filter(id => id !== blockId);
        } else {
          return [...prev, blockId];
        }
      });
      return;
    }

    if (!linkingSource) return; // 연결 모드가 아니면 무시
    if (linkingSource === blockId) {
      setLinkingSource(null); // 자기 자신 클릭 시 취소
      return;
    }

    // 중복 체크
    const exists = connections.find(c =>
      (c.source === linkingSource && c.target === blockId) ||
      (c.target === linkingSource && c.source === blockId)
    );

    if (!exists) {
      setConnections([...connections, { id: `conn_${Date.now()}`, source: linkingSource, target: blockId, type: linkingType }]);
    }
    setLinkingSource(null);
    setLinkingType('flow'); // 초기화
  };

  const removeConnection = (connId) => {
    setConnections(connections.filter(c => c.id !== connId));
  };

  const updateConnectionType = (connId, newType) => {
    setConnections(connections.map(c => c.id === connId ? { ...c, type: newType } : c));
  };

  // --- 관계 유형 관리 로직 ---
  const openRelationModal = () => {
    setEditingRelations(JSON.parse(JSON.stringify(relationTypes))); // 딥 카피
    setIsRelationModalOpen(true);
  };

  const closeRelationModal = () => {
    setIsRelationModalOpen(false);
  };

  const saveRelationTypes = () => {
    if (Object.keys(editingRelations).length === 0) {
      alert("최소 1개의 관계 유형이 필요합니다.");
      return;
    }
    setRelationTypes(editingRelations);
    setIsRelationModalOpen(false);

    // 현재 선택된 연결 모드 타입이 삭제되었다면 첫 번째 항목으로 폴백
    if (!editingRelations[linkingType]) {
      setLinkingType(Object.keys(editingRelations)[0]);
    }

    // 현재 하이라이트 중인 타입이 삭제되었다면 하이라이트 해제
    if (highlightedRelationType && !editingRelations[highlightedRelationType]) {
      setHighlightedRelationType(null);
    }
  };

  const addRelationType = () => {
    const newId = `rel_${Date.now()}`;
    setEditingRelations({
      ...editingRelations,
      [newId]: { label: '새 관계', color: '#3b82f6' }
    });
  };

  const updateEditingRelation = (id, field, value) => {
    setEditingRelations({
      ...editingRelations,
      [id]: { ...editingRelations[id], [field]: value }
    });
  };

  const deleteEditingRelation = (id) => {
    const newRels = { ...editingRelations };
    delete newRels[id];
    setEditingRelations(newRels);
  };

  // --- 드래그 앤 드롭 로직 ---
  const handleDragStart = (e, id) => {
    setDraggedBlockId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedBlockId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedBlockId) return;

    setBlocks(prevBlocks => {
      const updatedBlocks = [...prevBlocks];
      const blockIndex = updatedBlocks.findIndex(b => b.id === draggedBlockId);

      if (blockIndex > -1) {
        const block = updatedBlocks[blockIndex];
        // 컬럼이 변경된 경우 순서를 맨 아래로 이동
        if (block.columnId !== targetColumnId) {
          const targetColBlocks = updatedBlocks.filter(b => b.columnId === targetColumnId);
          block.order = targetColBlocks.length;
        }
        block.columnId = targetColumnId;
      }
      return updatedBlocks;
    });
  };

  // --- 위/아래 순서 변경 (같은 컬럼 내) ---
  const moveBlock = (id, direction) => {
    setBlocks(prevBlocks => {
      const blockToMove = prevBlocks.find(b => b.id === id);
      const columnBlocks = prevBlocks.filter(b => b.columnId === blockToMove.columnId).sort((a, b) => a.order - b.order);
      const currentIndex = columnBlocks.findIndex(b => b.id === id);

      if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === columnBlocks.length - 1)) {
        return prevBlocks; // 이동 불가
      }

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetBlock = columnBlocks[targetIndex];

      return prevBlocks.map(b => {
        if (b.id === blockToMove.id) return { ...b, order: targetBlock.order };
        if (b.id === targetBlock.id) return { ...b, order: blockToMove.order };
        return b;
      });
    });
  };

  return (
    <div style={{ display: isActive ? 'flex' : 'none' }} className="w-full h-full flex flex-col bg-neutral-100 font-sans overflow-hidden">
      <style>{`
        @keyframes dashAnim { to { stroke-dashoffset: -20; } }
        .line-path { animation: dashAnim 1s linear infinite; }
      `}</style>

      {/* Header */}
      <div className="p-6 pb-0 flex-shrink-0">
        <header className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex gap-2 mb-2">
              <button
                onClick={handleNewProject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 hover:text-indigo-600 transition-colors"
                title="새 프로젝트"
              >
                <FilePlus size={14} /> 새 프로젝트
              </button>
              <button
                onClick={handleSaveProject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 hover:text-indigo-600 transition-colors"
                title="프로젝트 저장"
              >
                <Download size={14} /> 저장
              </button>
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 rounded hover:bg-neutral-50 hover:text-indigo-600 transition-colors"
                title="프로젝트 불러오기"
              >
                <FolderOpen size={14} /> 불러오기
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLoadProject}
                className="hidden"
                accept=".json"
              />
            </div>
            <input
              type="text"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="프로젝트 제목"
              className="text-3xl font-bold text-neutral-800 tracking-tight bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-100 rounded px-1 py-0.5 w-full -ml-1"
            />
            <input
              type="text"
              value={boardSubtitle}
              onChange={(e) => setBoardSubtitle(e.target.value)}
              placeholder="프로젝트 설명"
              className="text-neutral-500 mt-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-100 rounded px-1 py-0.5 w-full -ml-1 text-sm sm:text-base"
            />
          </div>

          <div className="flex items-start gap-4 pt-1">
            {/* Alerts Area (Left of buttons) */}
            <div className="flex flex-col gap-2 items-end">
              {/* 하이라이트 모드 활성 알림창 */}
              {highlightedRelationType && (
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold border border-indigo-200 shadow-sm transition-all flex-shrink-0">
                  <Focus size={16} className="animate-pulse" />
                  <span className="text-xs">'{relationTypes[highlightedRelationType]?.label}' 집중 모드</span>
                  <button onClick={() => setHighlightedRelationType(null)} className="ml-2 hover:bg-indigo-200 p-1 rounded-full transition-colors"><X size={14} /></button>
                </div>
              )}

              {/* 연결 중 활성 알림창 */}
              {linkingSource && (
                <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-medium border border-amber-300 shadow-sm z-50">
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <Link size={16} />
                    <span className="text-xs">연결 대상 선택</span>
                  </div>
                  <div className="h-3 w-px bg-amber-300 mx-1"></div>
                  <div className="flex items-center gap-1">
                    <select
                      value={linkingType}
                      onChange={(e) => setLinkingType(e.target.value)}
                      className="text-xs bg-white border border-amber-200 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-amber-400 text-neutral-700"
                    >
                      {Object.entries(relationTypes).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setLinkingSource(null)} className="ml-1 hover:bg-amber-200 p-0.5 rounded-full transition-colors"><X size={14} /></button>
                </div>
              )}
            </div>

            {/* Buttons Area (Right side, 2 rows) */}
            <div className="flex flex-col gap-2 items-end">
              {/* Row 1: Search, Filter, Zoom, Memo */}
              <div className="flex items-center gap-2">
                {/* 검색 바 */}
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 text-neutral-400" size={14} />
                  <input
                    type="text"
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-7 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40 transition-all focus:w-56"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 text-neutral-400 hover:text-neutral-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* 필터 설정 */}
                <div className="relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap text-xs ${isFilterOpen || highlightedRelationType ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-neutral-300 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    title="필터 설정"
                  >
                    <Filter size={14} /> 필터 {hiddenRelationTypes.length > 0 && !highlightedRelationType && <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 absolute top-0 right-0 -mt-0.5 -mr-0.5"></span>}
                  </button>

                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-2">
                        <div className="px-3 py-2 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 rounded-t-lg">
                          <span className="text-xs font-bold text-neutral-500">관계선 필터 및 강조</span>
                          <div className="flex gap-2">
                            <button onClick={() => setHiddenRelationTypes([])} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">모두 켜기</button>
                            <button onClick={() => setHiddenRelationTypes(Object.keys(relationTypes))} className="text-xs text-neutral-400 hover:text-neutral-600 font-medium">모두 끄기</button>
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1">
                          {Object.entries(relationTypes).map(([key, { label, color }]) => {
                            const isVisible = !hiddenRelationTypes.includes(key);
                            const isHighlighted = highlightedRelationType === key;

                            return (
                              <div key={key} className="flex items-center justify-between px-2 py-1 hover:bg-neutral-50 rounded-lg transition-colors group">
                                {/* Visibility Toggle */}
                                <button
                                  onClick={() => {
                                    if (isVisible) setHiddenRelationTypes([...hiddenRelationTypes, key]);
                                    else setHiddenRelationTypes(hiddenRelationTypes.filter(t => t !== key));
                                  }}
                                  className="flex items-center gap-2 flex-1 p-2 text-left"
                                >
                                  <div className={`w-3 h-3 rounded-full transition-all ${isVisible ? 'scale-100' : 'scale-50 opacity-30'}`} style={{ backgroundColor: color }}></div>
                                  <span className={`text-sm transition-colors ${isVisible ? 'text-neutral-700' : 'text-neutral-400 line-through'}`}>{label}</span>
                                </button>

                                {/* Highlight Button */}
                                <button
                                  onClick={() => {
                                    if (isHighlighted) setHighlightedRelationType(null);
                                    else {
                                      setHighlightedRelationType(key);
                                      setIsFilterOpen(false); // 강조시 메뉴 닫기 (선택적)
                                    }
                                  }}
                                  className={`p-1.5 rounded-md transition-all flex items-center gap-1 border text-xs font-bold ${isHighlighted
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-neutral-400 border-neutral-200 hover:border-indigo-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100'
                                    }`}
                                  title="이 관계만 집중해서 보기"
                                >
                                  <Focus size={14} />
                                  {isHighlighted && '집중 중'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 줌 컨트롤 */}
                <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5">
                  <button onClick={handleZoomOut} className="p-1 hover:bg-neutral-100 rounded text-neutral-600" title="축소">
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[10px] font-medium w-8 text-center text-neutral-600">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={handleZoomIn} className="p-1 hover:bg-neutral-100 rounded text-neutral-600" title="확대">
                    <ZoomIn size={14} />
                  </button>
                  <button onClick={resetZoom} className="p-1 hover:bg-neutral-100 rounded text-neutral-600 ml-0.5 border-l border-neutral-200" title="초기화">
                    <RotateCcw size={12} />
                  </button>
                </div>

                {/* 메모장 버튼 */}
                <button
                  onClick={() => setIsNoteOpen(!isNoteOpen)}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap text-xs ${isNoteOpen
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 hover:text-amber-600'
                    }`}
                  title="프로젝트 메모"
                >
                  <StickyNote size={14} /> 메모
                </button>

                {/* AI 실험실 버튼 */}
                <button
                  onClick={() => setIsAiExperimentModalOpen(true)}
                  className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap text-xs ${isExperimentMode
                    ? 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 hover:text-purple-600'
                    }`}
                  title="AI 실험실"
                >
                  <Sparkles size={14} /> AI 실험실
                </button>
              </div>

              {/* Row 2: Multi-Select, Relation Settings, Add Column */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectionMode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${isSelectionMode
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 hover:text-indigo-600'
                    }`}
                  title="다중 선택 모드"
                >
                  <CheckSquare size={14} /> 다중 선택
                </button>

                <button
                  onClick={openRelationModal}
                  className="flex items-center gap-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Settings size={14} /> 관계 설정
                </button>

                <button
                  onClick={handleAddColumn}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Plus size={14} /> 새로운 단계 추가
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Board */}
      < div
        ref={boardRef}
        className="flex-1 overflow-auto bg-neutral-100/50 relative" // overflow-auto on container, bg styling
        onScroll={drawLines}
      >
        <div
          className="flex gap-6 px-6 pb-6 min-h-full min-w-max origin-top-left relative"
          style={{
            zoom: zoomLevel // Use CSS zoom property for layout scaling
          }}
        >
          {/* SVG 연결선 레이어 - 블록 위로 표시되도록 z-index 50으로 설정 */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-50 overflow-visible" style={{ minWidth: 'max-content' }}>
            {lines.map(line => {
              // 집중 모드일 때는 집중 대상 선만 렌더링, 일반 모드일 때는 필터 정책 따름
              const isFocusMismatch = highlightedRelationType && line.type !== highlightedRelationType;
              const isFilterHidden = !highlightedRelationType && hiddenRelationTypes.includes(line.type);

              if (isFocusMismatch || isFilterHidden) return null;

              return (
                <path
                  key={line.id}
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={highlightedRelationType === line.type ? "5" : "4"}
                  strokeLinecap="round"
                  strokeDasharray="8,8"
                  className="line-path transition-all duration-300"
                  style={{
                    filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))',
                    opacity: 0.95
                  }}
                />
              );
            })}
          </svg>

          {columns.map(column => {
            const columnBlocks = blocks
              .filter(b => b.columnId === column.id)
              .sort((a, b) => a.order - b.order);

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80 bg-white/50 border border-neutral-200 rounded-xl flex flex-col snap-center relative z-10 h-fit"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-4 border-b border-neutral-200 bg-white rounded-t-xl flex justify-between items-center sticky top-0 z-20 group/col gap-2">
                  <input
                    type="text"
                    value={column.title}
                    onChange={(e) => {
                      setColumns(columns.map(c => c.id === column.id ? { ...c, title: e.target.value } : c));
                    }}
                    className="font-bold text-neutral-700 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-100 rounded px-1 flex-1 w-full min-w-0"
                  />
                  <div className="flex items-center gap-1">
                    <span className="bg-neutral-200 text-neutral-600 text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">
                      {columnBlocks.length}
                    </span>
                    <button
                      onClick={() => openAiModal(column.id)}
                      className="opacity-0 group-hover/col:opacity-100 text-neutral-400 hover:text-purple-600 p-1 transition-opacity flex-shrink-0"
                      title="AI 블록 자동 생성"
                    >
                      <Sparkles size={16} />
                    </button>
                    <button
                      onClick={() => requestDeleteColumn(column.id)}
                      className="opacity-0 group-hover/col:opacity-100 text-neutral-400 hover:text-red-500 p-1 transition-opacity flex-shrink-0"
                      title="단계 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col gap-3 min-h-[500px]" onScroll={drawLines}>
                  {columnBlocks.map((block, index) => {
                    const isLinkingTarget = linkingSource && linkingSource !== block.id;
                    const isLinkingSelf = linkingSource === block.id;

                    // 검색 필터 판단 (제목, 설명, 태그 포함)
                    const doesNotMatchSearch = searchQuery && !(
                      block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      block.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (block.tags && block.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
                    );

                    // 하이라이트 모드 판단: 연결된 블록 리스트(Set)에 자신이 없는 경우 희미해짐
                    const isDimmed = (highlightedRelationType && connectedBlockIds && !connectedBlockIds.has(block.id)) || doesNotMatchSearch;

                    // AI Experiment Diff Styling
                    let experimentStyle = '';
                    if (isExperimentMode && experimentDiff) {
                      if (viewMode === 'original') {
                        if (experimentDiff.deleted.includes(block.id)) {
                          experimentStyle = 'ring-2 ring-red-500 bg-red-50 border-red-500';
                        } else if (experimentDiff.modified.includes(block.id)) {
                          experimentStyle = 'ring-2 ring-red-400 bg-red-50/50 border-red-400 border-dashed';
                        }
                      } else if (viewMode === 'modified') {
                        if (experimentDiff.added.includes(block.id)) {
                          experimentStyle = 'ring-2 ring-green-500 bg-green-50 border-green-500';
                        } else if (experimentDiff.modified.includes(block.id)) {
                          experimentStyle = 'ring-2 ring-green-500 bg-green-50/50 border-green-500 border-dashed';
                        }
                      }
                    }

                    return (
                      <div
                        key={block.id}
                        id={`block-${block.id}`}
                        draggable={!linkingSource}
                        onDragStart={(e) => handleDragStart(e, block.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleBlockClick(block.id)}
                        className={`group relative bg-white border-l-4 rounded-lg shadow-sm p-4 transition-all duration-300 ${BLOCK_TYPES[block.type].color.split(' ')[2]}
                        ${linkingSource ? (isLinkingTarget ? 'cursor-pointer hover:ring-2 hover:ring-amber-400 hover:scale-[1.02]' : '') : ''}
                        ${!linkingSource && !isSelectionMode ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''}
                        ${isSelectionMode ? 'cursor-pointer hover:bg-neutral-50' : ''}
                        ${isSelectionMode && selectedBlockIds.includes(block.id) ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
                        ${isLinkingSelf ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''}
                        ${isDimmed ? 'opacity-30 grayscale saturate-50 pointer-events-none' : ''}
                        ${experimentStyle}
                      `}
                      >
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2 z-10 text-indigo-500">
                            {selectedBlockIds.includes(block.id) ? <CheckSquare size={20} fill="white" /> : <Square size={20} className="text-neutral-300" />}
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${BLOCK_TYPES[block.type].color.split(' ')[0]} ${BLOCK_TYPES[block.type].color.split(' ')[1]}`}>
                            {BLOCK_TYPES[block.type].label}
                          </span>

                          {/* Actions */}
                          <div className={`flex transition-opacity gap-1 ${linkingSource || isSelectionMode ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button onClick={(e) => { e.stopPropagation(); setLinkingSource(block.id); }} className="p-1 text-neutral-400 hover:text-amber-600" title="블록 연결"><Link size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} disabled={index === 0} className="p-1 text-neutral-400 hover:text-indigo-600 disabled:opacity-30" title="위로"><ChevronUp size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} disabled={index === columnBlocks.length - 1} className="p-1 text-neutral-400 hover:text-indigo-600 disabled:opacity-30" title="아래로"><ChevronDown size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); openModal(block); }} className="p-1 text-neutral-400 hover:text-blue-600" title="수정"><Edit2 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 text-neutral-400 hover:text-red-600" title="삭제"><Trash2 size={16} /></button>
                          </div>
                        </div>

                        <h3 className="font-bold text-neutral-800 text-sm mb-1 leading-tight">{block.title}</h3>
                        <p className="text-neutral-500 text-xs line-clamp-3 leading-relaxed pointer-events-none">{block.description}</p>

                        {/* 태그 표시 영역 */}
                        {(block.tags && block.tags.length > 0) && (
                          <div className="mt-3 flex flex-wrap gap-1 pointer-events-none">
                            {block.tags.map((tag, i) => (
                              <span key={i} className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Drag Handle Indicator */}
                        {!linkingSource && !isDimmed && (
                          <div className="absolute top-1/2 -left-3 -translate-y-1/2 opacity-0 group-hover:opacity-50 text-neutral-400 pointer-events-none">
                            <GripVertical size={16} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty Drop Zone Helper */}
                  {columnBlocks.length === 0 && (
                    <div className="h-full border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-neutral-400 text-sm py-10">
                      여기로 블록을 드래그하세요
                    </div>
                  )}

                  {/* Add block to specific column button */}
                  <button
                    onClick={() => openModal(null, column.id)}
                    className="mt-2 text-sm text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-transparent hover:border-indigo-100"
                  >
                    <Plus size={16} /> 블록 추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div >

      {/* Batch Tagging Bar (Fixed Position outside scroll container) */}
      {
        isSelectionMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white p-2 rounded-lg shadow-2xl border border-indigo-200 z-50 animate-in fade-in slide-in-from-bottom-4 ring-1 ring-black/5">
            <div className="flex items-center gap-2 px-2 border-r border-neutral-200 mr-1">
              <CheckSquare size={18} className="text-indigo-600" />
              <span className="text-sm font-bold text-neutral-700">{selectedBlockIds.length}개 선택됨</span>
            </div>
            <input
              type="text"
              value={batchTagInput}
              onChange={(e) => setBatchTagInput(e.target.value)}
              placeholder="태그 입력..."
              className="text-sm border border-neutral-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
              onKeyDown={(e) => e.key === 'Enter' && handleBatchAddTag()}
            />
            <button
              onClick={handleBatchAddTag}
              disabled={selectedBlockIds.length === 0 || !batchTagInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Tag size={14} /> 태그 추가
            </button>
            <button
              onClick={toggleSelectionMode}
              className="ml-1 text-neutral-500 hover:text-neutral-700 p-1.5 hover:bg-neutral-100 rounded"
              title="선택 모드 종료"
            >
              <X size={18} />
            </button>
          </div>
        )
      }

      {/* AI Generate Modal */}
      {
        isAiModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold mb-2 text-neutral-800 flex items-center gap-2">
                <Sparkles className="text-purple-500" size={24} />
                AI 스토리 블록 생성
              </h2>
              <p className="text-sm text-neutral-500 mb-4">
                Google Gemini API를 사용하여 스토리 내용을 분석하고 자동으로 블록을 생성합니다.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-neutral-500 mb-1">AI 모델 선택</label>
                <select
                  value={aiModel}
                  onChange={(e) => saveAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (빠름, 추천)</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (고성능)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-neutral-500 mb-1">Google Gemini API Key</label>
                <input
                  type="password"
                  value={userApiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="API Key를 여기에 입력하세요"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  API Key는 브라우저에만 저장되며 서버로 전송되지 않습니다. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-500 hover:underline">여기서 키 발급받기</a>
                </p>
              </div>

              <textarea
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="스토리 요약이나 플롯을 여기에 붙여넣으세요..."
                className="w-full h-48 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none mb-4 text-sm leading-relaxed"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  disabled={isAiLoading}
                >
                  취소
                </button>
                <button
                  onClick={handleAiGeneration}
                  disabled={!aiInputText.trim() || !userApiKey.trim() || isAiLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      AI 블록 생성하기
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal for Edit/Create */}
      {
        isModalOpen && editingBlock && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold mb-6 text-neutral-800 flex-shrink-0">
                {editingBlock.title ? '스토리 블록 수정' : '새 스토리 블록'}
              </h2>

              <form onSubmit={saveBlock} className="space-y-4 overflow-y-auto flex-1 pr-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">블록 유형</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(BLOCK_TYPES).map(([type, { label, color }]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditingBlock({ ...editingBlock, type })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${editingBlock.type === type
                          ? `${color.split(' ')[2]} ring-2 ring-offset-1 ring-${color.split(' ')[0].split('-')[1]}-400`
                          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">블록 제목</label>
                  <input
                    required
                    type="text"
                    value={editingBlock.title}
                    onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                    placeholder="예: 마왕군 간부의 기습"
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">상세 내용 (플롯/묘사)</label>
                  <textarea
                    required
                    rows="4"
                    value={editingBlock.description}
                    onChange={(e) => setEditingBlock({ ...editingBlock, description: e.target.value })}
                    placeholder="이 구간에서 어떤 사건이 발생하고 캐릭터가 어떻게 변화하는지 작성하세요."
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                {/* 태그 입력 영역 추가 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">태그 (Enter로 추가)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editingBlock.tags || []).map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setEditingBlock({ ...editingBlock, tags: editingBlock.tags.filter(t => t !== tag) })}
                          className="text-indigo-400 hover:text-indigo-600"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); // 폼 제출 방지
                          const newTag = tagInput.trim().replace(/^#/, ''); // 사용자가 #을 쳐도 제거됨
                          if (newTag && !(editingBlock.tags || []).includes(newTag)) {
                            setEditingBlock({ ...editingBlock, tags: [...(editingBlock.tags || []), newTag] });
                          }
                          setTagInput('');
                        }
                      }}
                      placeholder="태그 입력 후 Enter (예: 사이다, 회귀)"
                      className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">위치 (단계)</label>
                  <select
                    value={editingBlock.columnId}
                    onChange={(e) => setEditingBlock({ ...editingBlock, columnId: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>

                {/* 연결된 블록 관리 영역 */}
                {editingBlock.id && blocks.some(b => b.id === editingBlock.id) && (
                  <div className="border-t border-neutral-100 pt-4 mt-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">연결된 블록 관리</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {connections.filter(c => c.source === editingBlock.id || c.target === editingBlock.id).length === 0 ? (
                        <p className="text-xs text-neutral-400">연결된 블록이 없습니다.</p>
                      ) : (
                        connections.filter(c => c.source === editingBlock.id || c.target === editingBlock.id).map(conn => {
                          const isSource = conn.source === editingBlock.id;
                          const relatedBlockId = isSource ? conn.target : conn.source;
                          const relatedBlock = blocks.find(b => b.id === relatedBlockId);
                          const relType = relationTypes[conn.type] || Object.values(relationTypes)[0] || DEFAULT_RELATION_TYPES.flow;

                          if (!relatedBlock) return null;

                          return (
                            <div key={conn.id} className="flex flex-col bg-neutral-50 p-3 rounded-lg border border-neutral-200 gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 truncate flex-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSource ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {isSource ? 'To' : 'From'}
                                  </span>
                                  <span className="truncate text-neutral-800 text-sm font-medium">{relatedBlock.title}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeConnection(conn.id)}
                                  className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                                  title="연결 해제"
                                >
                                  <Unlink size={16} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between pl-8">
                                <select
                                  value={conn.type || Object.keys(relationTypes)[0]}
                                  onChange={(e) => updateConnectionType(conn.id, e.target.value)}
                                  className="text-xs px-2 py-1 rounded border outline-none font-medium cursor-pointer transition-colors"
                                  style={{
                                    color: relType.color,
                                    backgroundColor: `${relType.color}15`,
                                    borderColor: `${relType.color}40`
                                  }}
                                >
                                  {Object.entries(relationTypes).map(([key, { label }]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                  >
                    저장하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Relation Types Modal */}
      {
        isRelationModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={closeRelationModal}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold mb-6 text-neutral-800 flex-shrink-0">
                관계 유형 설정
              </h2>

              <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                {Object.entries(editingRelations).map(([id, rel]) => (
                  <div key={id} className="flex items-center gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                    <input
                      type="color"
                      value={rel.color}
                      onChange={(e) => updateEditingRelation(id, 'color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={rel.label}
                      onChange={(e) => updateEditingRelation(id, 'label', e.target.value)}
                      placeholder="관계 이름"
                      className="flex-1 px-3 py-1.5 border border-neutral-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    />
                    <button
                      onClick={() => deleteEditingRelation(id)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addRelationType}
                  className="w-full py-2 flex items-center justify-center gap-2 text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm font-medium mt-2"
                >
                  <Plus size={16} /> 새 관계 추가
                </button>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-neutral-100 mt-4">
                <button
                  onClick={closeRelationModal}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveRelationTypes}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Confirm Modal */}
      {
        confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative flex flex-col">
              <h3 className="text-lg font-bold text-neutral-800 mb-2">삭제 확인</h3>
              <p className="text-neutral-600 text-sm mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Notes Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-[60] transform transition-transform duration-300 flex flex-col border-l border-neutral-200 ${isNoteOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-neutral-200 bg-amber-50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-amber-800 font-bold">
            <StickyNote size={18} />
            <span>프로젝트 메모</span>
          </div>
          <button onClick={() => setIsNoteOpen(false)} className="text-neutral-400 hover:text-neutral-600 p-1 hover:bg-neutral-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-4 bg-amber-50/30">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="이 프로젝트에 대한 아이디어나 메모를 자유롭게 작성하세요..."
            className="w-full h-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-neutral-700 placeholder-neutral-400"
            spellCheck="false"
          />
        </div>
      </div>

      {/* AI Experiment Modal */}
      {isAiExperimentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col">
            <h3 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={20} />
              AI 스토리 실험실
            </h3>
            <p className="text-neutral-600 text-sm mb-4">
              현재 스토리 보드를 바탕으로 AI에게 수정을 요청하세요.<br />
              결과를 미리 비교해보고 적용 여부를 결정할 수 있습니다.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-neutral-500 mb-1">AI 모델 선택</label>
              <select
                value={aiModel}
                onChange={(e) => saveAiModel(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (빠름, 추천)</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (고성능)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-neutral-500 mb-1">Google Gemini API Key</label>
              <input
                type="password"
                value={userApiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                placeholder="API Key를 여기에 입력하세요"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                API Key는 브라우저에만 저장되며 서버로 전송되지 않습니다. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-500 hover:underline">여기서 키 발급받기</a>
              </p>
            </div>

            <textarea
              value={experimentPrompt}
              onChange={(e) => setExperimentPrompt(e.target.value)}
              placeholder="예: 모든 악역 캐릭터를 입체적으로 바꿔줘, 혹은 결말을 해피엔딩에서 배드엔딩으로 변경해줘..."
              className="w-full h-32 p-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 resize-none"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAiExperimentModalOpen(false)}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800 font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAiExperiment}
                disabled={isAiLoading || !experimentPrompt.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    실험 시작
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Experiment Floating Controls */}
      {isExperimentMode && (
        <div className="fixed bottom-6 right-6 z-[80] bg-white rounded-xl shadow-2xl border border-purple-200 p-4 w-80 animate-in slide-in-from-bottom-4 fade-in">
          <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
            <div className="flex items-center gap-2 text-purple-700 font-bold">
              <Sparkles size={16} />
              <span>실험 결과 비교</span>
            </div>
            <span className="text-xs text-neutral-400">수정안 검토 중</span>
          </div>

          <div className="flex bg-neutral-100 p-1 rounded-lg mb-4">
            <button
              onClick={() => togglePreviewMode('original')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'original' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              수정 전 (Original)
            </button>
            <button
              onClick={() => togglePreviewMode('modified')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'modified' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              수정 후 (AI)
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={discardExperiment}
              className="flex-1 py-2 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-bold hover:bg-neutral-50 transition-colors"
            >
              취소 (Discard)
            </button>
            <button
              onClick={applyExperiment}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
            >
              적용 (Apply)
            </button>
          </div>
        </div>
      )}
    </div >
  );
}
