import React from 'react'
import DemoHeaderTN from "./HeaderTN";
import TaskboardKpiSummary from "./TaskboardKpi";
import PeopleInlineModule from "./PeopleInline";
import PageWorkViewTabs from "./PageWorkView";
import TimelineFeedSection from "./TimelineFeed";
import TasksTableSection from "./TasksTable";
import NotesTabDemo from "./NotesTab";
import { Drawer } from "antd";
export interface DrawerProps {
  open?: boolean;
  onClose?: () => void;
}
const Tasks:React.FC<DrawerProps> = ({open,onClose}) => {
    return (
        <Drawer   placement="right"
      width={1500}
      onClose={onClose}
      open={open}
      styles={{
        body: { padding: 0 },
      }}>
        <div className=' '>
            <DemoHeaderTN />
            <TaskboardKpiSummary />
            <PeopleInlineModule />
            <PageWorkViewTabs pageId={"0"}/>
            <TimelineFeedSection />
            <TasksTableSection />
            <NotesTabDemo />
        </div></Drawer>
    )
}

export default Tasks;