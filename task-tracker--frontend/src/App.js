import {Route, Routes} from 'react-router-dom'
import Login from './components/Login'
import SignUp from './components/SignUp'
import TasksDashboard from './components/TasksDashboard'

import './App.css';

const App = () => (

    <Routes>
    <Route exact path="/login" element={<Login />}/>
    <Route exact path="/signup" element={<SignUp />} />
    <Route exact path="/tasks" element={<TasksDashboard />} />
  </Routes>
)

export default App;
