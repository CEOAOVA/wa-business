import React from "react";
import Sidebar from "../components/Sidebar";
import ChatPanel from "../components/ChatPanel";

const Chats: React.FC = () => {
  return (
    <div className="h-screen w-screen flex bg-embler-dark overflow-hidden">
      <Sidebar />
      <ChatPanel />
    </div>
  );
};

export default Chats; 