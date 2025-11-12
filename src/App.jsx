import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Main } from "./pages/Main/main";
import { Room } from "./pages/Room/Room";
import { NotFound } from "./pages/NotFound/NotFound";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" exact element={<Main />} />
        <Route path="/room/:id" exact element={<Room />} />
        <Route path="*" exact element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
