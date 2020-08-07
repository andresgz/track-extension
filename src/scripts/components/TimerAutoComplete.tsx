import * as React from 'react';
import styled from '@emotion/styled';
import Highlighter from "react-highlight-words";
import * as keycode from 'keycode';

import { useAutoComplete } from '../lib/timeEntryAutoComplete'

import { label, withDot, withLargeDot } from '../@toggl/style/lib/text';
import { borderRadius } from '../@toggl/style/lib/variables';
import { greyish } from '../@toggl/style/lib/color';

type TimerAutoComplete= {
  timeEntries: Array<Toggl.TimeEntry>;
  filter: string;
  clients: Array<Toggl.Client>;
  tasks: Array<Toggl.Task>;
  projects: object;
  onSelect: (object) => void
  dropdownRef: React.RefObject<HTMLDivElement> | null;
};

export default function TimerAutocomplete ({ filter, onSelect, timeEntries, clients, tasks, projects, dropdownRef}: TimerAutoComplete) {
  const suggestionsRef = React.useRef<React.RefObject<HTMLLIElement>[]>([])
  const [focusedEntry, setFocusedEntry] = React.useState(0)

  const {
    suggestions,
    currentDropdown
  } = useAutoComplete(filter, timeEntries, projects, tasks)

  React.useEffect(() => {
    suggestionsRef.current = Array.from({
      length: suggestions.timeEntries.length +
      suggestions.projects.length +
      suggestions.tasks.length
    }, () => React.createRef<HTMLLIElement>())
  }, [filter, suggestions.timeEntries, suggestions.projects, suggestions.tasks])

  const onFocus = () => {
    suggestionsRef.current[focusedEntry].current?.focus()
  }

  const onKeyDown = (e) => {
    e.preventDefault()

    if(keycode(e.which) === 'down') {
      setFocusedEntry(focusedEntry < suggestionsRef.current.length - 1 ? focusedEntry + 1 : 0)
      suggestionsRef.current[focusedEntry].current?.focus()
    }

    if(keycode(e.which) === 'up') {
      setFocusedEntry(focusedEntry === 0 ? 0 : focusedEntry - 1)
      suggestionsRef.current[focusedEntry].current?.focus()
    }

    if(keycode(e.which) === 'enter') {
      if(focusedEntry < suggestions.timeEntries.length) {
        onSelect(suggestions.timeEntries[focusedEntry].item)
      }
    }
  }

  const hasItems = suggestions.timeEntries.length > 0 || suggestions.projects.length > 0 || suggestions.tasks.length > 0

  return filter.length >= 2 ?
    <Dropdown tabIndex={0} ref={dropdownRef} onFocus={onFocus} onKeyDown={onKeyDown}>
        {currentDropdown === 'main' && hasItems && <TimeEntrySuggestions suggestionsRef={suggestionsRef} onSelect={onSelect} allProjects={projects} filteredProjects={suggestions.projects} filteredTimeEntries={suggestions.timeEntries} filteredTasks={suggestions.tasks} clients={clients} filter={filter}/>}
        {currentDropdown === 'project' && <div>Projects dropdown!</div>}
        {currentDropdown === 'tag' && <div>Tags dropdown!</div>}
    </Dropdown>
        : null
}


function TimeEntrySuggestions ({ filter, filteredTimeEntries, filteredProjects, filteredTasks, allProjects, clients, onSelect, suggestionsRef }) {

  const refsIterator = suggestionsRef.current.values()

  return (
    <React.Fragment>
        {filteredTimeEntries.length > 0 &&
          <React.Fragment>
            <Label>Previously tracked time entries</Label>
            <Items>
              {
                filteredTimeEntries.map(({ item: timeEntry }) => <TimeEntrySuggestion ref={refsIterator.next().value} key={timeEntry.id} onSelect={onSelect} timeEntry={timeEntry} project={allProjects[timeEntry.pid]} client={allProjects[timeEntry.pid] && allProjects[timeEntry.pid].cid && clients[allProjects[timeEntry.pid].cid]} filter={filter} />)
              }
            </Items>
          </React.Fragment>
        }
        {filteredProjects.length > 0 &&
          <React.Fragment>
            <Label>Projects</Label>
            <Items>
              {
                filteredProjects.map(({ item: project }) => <ProjectSuggestion ref={refsIterator.next().value} key={project.id} project={project} filter={filter} client={project.cid && clients[project.cid]} />)
              }
            </Items>
          </React.Fragment>
        }
        {filteredTasks.length > 0 &&
          <React.Fragment>
            <Label>Task</Label>
            <Items>
              {
                filteredTasks.map(({ item: task }) => <TaskSuggestion ref={refsIterator.next().value} key={task.id} task={task} project={allProjects[task.pid]} filter={filter} />)
              }
            </Items>
          </React.Fragment>
        }
    </React.Fragment>
  )
}

type TimeEntrySuggestionProps = {
  timeEntry: Toggl.TimeEntry;
  project: Toggl.Project;
  filter: string;
  client: Toggl.Client;
  onSelect: (object) => void;
}

const TimeEntrySuggestion = React.forwardRef<HTMLLIElement, TimeEntrySuggestionProps>(({ timeEntry, project, filter, client, onSelect }, ref) => {
    return (
      <Entry tabIndex={0} ref={ref} onClick={() => onSelect(timeEntry)}>
        <Highlighter highlightStyle={{backgroundColor: 'rgba(0,0,0,0.06)'}} searchWords={[filter]} textToHighlight={timeEntry.description} />
        { project && <Project color={project.hex_color}>{project.name}</Project>}
        { client && <Client>{client.name}</Client>}
      </Entry>
    )
  }
)

type ProjectSuggestionProps = {
  project: Toggl.Project;
  filter: string;
  client: Toggl.Client;
}

const ProjectSuggestion = React.forwardRef<HTMLLIElement, ProjectSuggestionProps>(({ project, filter, client }, ref) => (
  <Entry tabIndex={0} ref={ref}>
    <Project color={project.hex_color}>
      <Highlighter highlightStyle={{backgroundColor: 'rgba(0,0,0,0.06)'}} searchWords={[filter]} textToHighlight={project.name} />
    </Project>
    { client && <Client>{client.name}</Client>}
  </Entry>
  )
)

type TaskSuggestionProps = {
  project: Toggl.Project;
  task: Toggl.Task;
  filter: string;
}

const TaskSuggestion = React.forwardRef<HTMLLIElement, TaskSuggestionProps>(({ task, project, filter }, ref) => (
  <Entry tabIndex={0} ref={ref}>
    <Task>
      <Highlighter highlightStyle={{backgroundColor: 'rgba(0,0,0,0.06)'}} searchWords={[filter]} textToHighlight={task.name} />
    </Task>
    <Project color={project.hex_color}>{project.name}</Project>
  </Entry>
  )
)

const Label = styled.div`
  ${label}
  padding: 10px;
`

const Entry = styled.li`
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 30px;
  cursor: pointer;

  &:hover, &:focus {
    border-radius: ${borderRadius};
    background-color: rgba(0,0,0,0.04);
  }
`

const Project = styled.span`
  ${withLargeDot}
  display: flex;
  align-items: center;
  color: ${({ color }) => color};

  &:before {
    color: ${({ color }) => color};
  }
`

const Client = styled.span`
  ${withDot}
`

const Task = styled.span`
  color: ${greyish};
`

const Dropdown = styled.div`
  position: absolute;
  top: 55px;
  z-index: 1000;
  max-height: 400px;
  width: 440px;
  margin: 0 8px;
  padding: 5px;

  border-radius: 8px;
  box-shadow: 0 2px 6px 0 rgba(0,0,0,.1);
  border: 1px solid rgba(0,0,0,.1);

  overflow-y: scroll;
  background: var(--base-color);
  color: var(--font-color);
`

const Items = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`
