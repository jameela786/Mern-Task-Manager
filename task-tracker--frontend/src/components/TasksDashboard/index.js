import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEdit, FaTrash,FaPlus,FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Cookies from 'js-cookie';
import './index.css';

const TaskDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate(); 
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', status: 'Pending' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(null);
  const [errors, setErrors] = useState({ title: '', description: '', due_date: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = Cookies.get('jwt_token');
    if (!token) {
      navigate('/login');
    } else {
      fetchTasks(perPage, currentPage, statusFilter);
    }
  }, [currentPage, perPage, statusFilter]);

  const fetchTasks = async (perPage, page, statusFilter) => {
    try {
      const token = Cookies.get('jwt_token'); 
      const response = await fetch(`https://mern-task-manager-r4sn.onrender.com/tasks?perPage=${perPage}&page=${page}&statusFilter=${statusFilter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status !== 200) {
        Cookies.remove('jwt_token'); 
        navigate('/login'); 
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      setTasks(data.tasks);
      setTotalTasks(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const resetTaskForm = () => {
    setNewTask({ title: '', description: '', due_date: '', status: 'Pending' });
    setErrors({ title: '', description: '', due_date: '' });
  };

  const handleCancelCreate = () => {
    resetTaskForm();
    setIsCreating(false);
  };

  const handleCreateTask = async () => {
    setErrors({ title: '', description: '', due_date: '' });
    if (!newTask.title || !newTask.description || !newTask.due_date) {
      setErrors({
        title: !newTask.title ? 'Title is required' : '',
        description: !newTask.description ? 'Description is required' : '',
        due_date: !newTask.due_date ? 'Due date is required' : ''
      });
      return;
    }
  
    try {
      const token = Cookies.get('jwt_token');
      const response = await fetch('https://mern-task-manager-r4sn.onrender.com/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTask),
      });
  
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      const createdTask = await response.json();
      toast.success('Task created successfully!');
      setTasks([...tasks, createdTask]);
      setIsCreating(false);
      resetTaskForm();
      fetchTasks(perPage, currentPage, statusFilter);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  
  const handleStatusChange = async (e, updatedTask) => {
    const updatedStatus = e.target.value;
    updatedTask.status = updatedStatus

    try {
      const token = Cookies.get('jwt_token');
      const response = await fetch(`https://mern-task-manager-r4sn.onrender.com/tasks/${updatedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedTask),
      });
  
      if (response.ok) {
        toast.success('Task updated successfully!');
        setTasks(tasks.map((task) =>
          task.id === updatedTask.id ? { ...task, status: updatedStatus } : task
        ));
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditing(false);
  };

  const handleEditClick = (task) => {
    setEditedTask({ ...task });
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    try {
      const token = Cookies.get('jwt_token'); 
      const response = await fetch(`https://mern-task-manager-r4sn.onrender.com/tasks/${editedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedTask), 
      });
  
      if (response.ok) {
        toast.success('Task updated successfully!');
        setTasks(tasks.map(task => 
          task.id === editedTask.id ? editedTask : task
        ));
        setIsEditing(false);
        setSelectedTask(editedTask);
      } else {
        const result = await response.json();
        console.error(result.error || 'Failed to save task');
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };
  



  const handleDeleteTask = async (taskId) => {
    try {
      const token = Cookies.get('jwt_token');
      const response = await fetch(`https://mern-task-manager-r4sn.onrender.com/tasks/${taskId}`, {
        method: 'DELETE',
              headers: {
        Authorization: `Bearer ${token}`,
      },
      });
      
      if (response.ok) {
        toast.success('Task deleted successfully!');
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        setSelectedTask(null);
        setIsEditing(false);
        if (tasks.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        } else {
          fetchTasks(perPage, currentPage, statusFilter);
        }
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };



  return (
    <div className="dashboard-container">
      <ToastContainer />
    <div className="dashboard-card">
      <div className="card-header">
        <h2 className="card-title">Task Dashboard</h2>
        <button className="create-task-button" onClick={() => setIsCreating(true)}>
          <FaPlus /> Create Task
        </button>
      </div>

      <div className="card-content">
        <div className="search-filter-container">
          <input
            type="text"
            placeholder="Search Tasks"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <select value={statusFilter} onChange={handleStatusFilterChange}>
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="task-list">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr 
                  key={task.id} 
                  className={`task-row ${task.completed ? 'completed' : ''}`}
                  onClick={() => handleTaskClick(task)}
                >
                  <td>{task.title}</td>
                  <td>{task.description}</td>
                  <td>{task.due_date}</td>
                  <td className="status-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e, task)}
                      className={`status-dropdown ${task.status.toLowerCase().replace(" ", "-")}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="action-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(task);
                      }}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="action-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination-container">
            <div className="pagination-controls">
              <button 
                className="pagination-button" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <FaChevronLeft />
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="pagination-button" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <FaChevronRight />
              </button>
            </div>
            <div className="per-page-selector">
              <span>Items per page:</span>
              <select 
                value={perPage} 
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Create Task Modal */}
    {isCreating && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Create New Task</h3>
          <input
            type="text"
            placeholder="Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          />
          {errors.title && <p className="error-message">{errors.title}</p>}

          <input
            type="text"
            placeholder="Description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
          />
          {errors.description && <p className="error-message">{errors.description}</p>}

          <input
            type="date"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
          />
          {errors.due_date && <p className="error-message">{errors.due_date}</p>}

          <select
            value={newTask.status}
            type="dropdown"
            onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="modal-buttons">
            <button className="cancel-button" onClick={handleCancelCreate}>Cancel</button>
            <button className="save-button" onClick={handleCreateTask}>Save</button>
          </div>
        </div>
      </div>
    )}

{isEditing && editedTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Task</h3>
            <div className="form-container">
              <div className="form-group">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  value={editedTask.title}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    title: e.target.value
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <input
                  id="edit-description"
                  type="text"
                  value={editedTask.description}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    description: e.target.value
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-due-date">Due Date</label>
                <input
                  id="edit-due-date"
                  type="date"
                  value={editedTask.due_date}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    due_date: e.target.value
                  })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  value={editedTask.status}
                  onChange={(e) => setEditedTask({
                    ...editedTask,
                    status: e.target.value
                  })}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="modal-buttons">
              <button className="cancel-button" onClick={() => setIsEditing(false)}>
                Close
              </button>
              <button className="save-button" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Task Details Modal */}
    {selectedTask && !isEditing && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Task Details</h3>
          <div className="details-container">
            <div className="detail-group">
              <label>Title</label>
              <p className="detail-text">{selectedTask.title}</p>
            </div>
            <div className="detail-group">
              <label>Description</label>
              <p className="detail-text">{selectedTask.description}</p>
            </div>
            <div className="detail-group">
              <label>Due Date</label>
              <p className="detail-text">{selectedTask.due_date}</p>
            </div>
            <div className="detail-group">
              <label>Status</label>
              <p className="detail-text">{selectedTask.status}</p>
            </div>
          </div>
          <div className="modal-buttons">
            <button className="cancel-button" onClick={() => setSelectedTask(null)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};


export default TaskDashboard;