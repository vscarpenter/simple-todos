/**
 * Unit Tests for BoardService
 * Tests the business logic for board management.
 */

import { jest } from '@jest/globals';

// Mock eventBus before any imports using unstable_mockModule
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

jest.unstable_mockModule('../../../scripts/modules/eventBus.js', () => ({
  default: mockEventBus
}));

// Import the service and models after mocking
const { BoardService } = await import('../../../scripts/modules/services/boardService.js');
const { Board, createBoard } = await import('../../../scripts/modules/models.js');

describe('BoardService', () => {
  let boardService;
  let mockState;
  let mockStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear the eventBus mock
    mockEventBus.emit.mockClear();

    // Create fresh mocks for each test
    mockState = {
        getState: jest.fn(),
        setState: jest.fn(),
        getTasksForBoard: jest.fn().mockReturnValue([]),
    };
    mockStorage = {
        save: jest.fn().mockResolvedValue(true),
    };

    // Instantiate the service with mocks
    boardService = new BoardService(mockState, mockStorage);
  });

  describe('createBoard', () => {
    test('should create a board successfully', async () => {
      // Arrange
      mockState.getState.mockReturnValue({ boards: [] });

      // Act
      const newBoard = await boardService.createBoard({ name: 'New Board' });

      // Assert
      expect(newBoard).toBeInstanceOf(Board);
      expect(newBoard.name).toBe('New Board');
      
      expect(mockState.setState).toHaveBeenCalledWith({
        boards: [expect.any(Object)],
        currentBoardId: newBoard.id,
        tasks: [],
      });

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:created', { board: newBoard });
      expect(mockEventBus.emit).toHaveBeenCalledWith('data:changed');
    });

    test('should make the first board the default board', async () => {
        mockState.getState.mockReturnValue({ boards: [] });
        const firstBoard = await boardService.createBoard({ name: 'First Board' });
        
        mockState.getState.mockReturnValue({ boards: [firstBoard] });
        const secondBoard = await boardService.createBoard({ name: 'Second Board' });

        expect(firstBoard.isDefault).toBe(true);
        expect(secondBoard.isDefault).toBe(false);
    });

    test('should throw an error for a duplicate board name', async () => {
        const existingBoard = { id: 'board-1', name: 'Existing Board' };
        mockState.getState.mockReturnValue({ boards: [existingBoard] });
        await expect(boardService.createBoard({ name: 'Existing Board' })).rejects.toThrow('A board with this name already exists');
    });
  });

  describe('updateBoard', () => {
    test('should update a board successfully', async () => {
      // Arrange
      const board = createBoard({ name: 'Original Name' });
      mockState.getState.mockReturnValue({ boards: [board] });
      const updates = { name: 'Updated Name', description: 'New Desc' };

      // Act
      const updatedBoard = await boardService.updateBoard(board.id, updates);

      // Assert
      expect(updatedBoard.name).toBe('Updated Name');
      expect(updatedBoard.description).toBe('New Desc');
      
      expect(mockState.setState).toHaveBeenCalledWith({
        boards: [expect.objectContaining({ name: 'Updated Name' })],
        tasks: [],
      });

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:updated', expect.any(Object));
    });
  });

  describe('deleteBoard', () => {
    test('should delete a board successfully', async () => {
      // Arrange
      const board1 = createBoard({ name: 'Board 1', isDefault: true });
      const board2 = createBoard({ name: 'Board 2' });
      mockState.getState.mockReturnValue({ boards: [board1, board2], currentBoardId: board2.id });

      // Act
      const result = await boardService.deleteBoard(board2.id);

      // Assert
      expect(result).toBe(true);
      expect(mockState.setState).toHaveBeenCalledWith(expect.objectContaining({
        boards: [board1],
      }));
      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('board:deleted', expect.any(Object));
    });
  });
});