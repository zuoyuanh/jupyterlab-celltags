import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICellTools, CellTools, INotebookTracker
} from '@jupyterlab/notebook';

import {
  Widget, PanelLayout
} from '@phosphor/widgets';

import {
  Cell
} from '@jupyterlab/cells';

import {
  Message
} from '@phosphor/messaging';

import {
  ObservableJSON
} from '@jupyterlab/observables';

import {
  write_tag
} from './celltags';

import * as React from 'react';

import * as ReactDOM from 'react-dom';

import '../style/index.css';

const TAG_TOOL_CLASS = 'jp-cellTags-Tools';
const TAG_LABEL_DIV_CLASS = 'jp-cellTags-tag-label-div';
const TAG_SELECTED_LABEL_DIV_CLASS = 'jp-cellTags-selected-tag-label-div';
const TAG_ADD_DIV = 'jp-cellTags-tag-add-div';
const TAG_EDIT_DIV = 'jp-cellTags-tag-edit-div';
const TAG_INPUT = 'jp-cellTags-tag-input';
const EDIT_TAG_INPUT = 'jp-cellTags-edit-tag-input';

class TagsToolComponent extends React.Component<any, any> {

  constructor(props: any) {
    super(props);
    this.state = { selectedTag: null };
    this.handleSelectingTag = this.handleSelectingTag.bind(this);
  }

  handleSelectingTag(name: string, deleted: boolean) {
    if (deleted) {
      this.setState({ selectedTag: null });
    } else if (this.state.selectedTag == null || this.state.selectedTag != name) {
      this.setState({ selectedTag: name });
    } else {
      this.setState({ selectedTag: null });
    }
  }

  render() {
    return (
      <div>
        <span className="tag-header">Tags in Active Cell</span><hr className="tag-header-hr"/>
        <TagsForSelectedCellComponent widget={ this.props.widget } tags={ this.props.tagsList } 
          selected={ this.state.selectedTag } selectHandler={ this.handleSelectingTag } />
        <span className="tag-header">All Tags In Notebook</span><hr className={"tag-header-hr"}/>
        <AllTagsInNotebookComponent widget={ this.props.widget } tags={ this.props.allTagsList } 
          selected={ this.state.selectedTag } selectHandler={ this.handleSelectingTag } />
        <span className="tag-header">Tag Operations</span><hr className={"tag-header-hr"}/>
        <TagOperationsComponent widget={ this.props.widget } tags={ this.props.allTagsList } 
          selected={ this.state.selectedTag } selectHandler={ this.handleSelectingTag } />
      </div>
    );
  }
}

class TagsComponent extends React.Component<any, any> {

  constructor(props: any) {
    super(props);
    this.state = { editingSelectedTag: false };
  }

  didSelectTagWithName(name: string) {
    if ((!this.state.editingSelectedTag) || (this.props.selected != name)) {
      this.setState({ editingSelectedTag: false });
      this.props.selectHandler(name,false);
    }
  }

  singleCellOperationButton(name: string) {
    return <img src={ require("../static/darkgrey_addcircle.svg") } key={ name } />;
  }

  singleCellOperationHandler(name: string) {
    console.log(name);
  }

  renderElementForTags(tags: string[]) {
    const selectedTag = this.props.selected as string;
    return tags.map((tag, index) => {
      const tagClass = (selectedTag === tag) ? TAG_SELECTED_LABEL_DIV_CLASS : TAG_LABEL_DIV_CLASS;
      return (
        <div
          key={ tag }
          className={ tagClass }
          onClick={ (event) =>
            this.didSelectTagWithName(tag)
          }
        >
          <label>{ tag }</label>
          <label onClick={ (event) => {
            event.stopPropagation();
            this.singleCellOperationHandler(tag);
          } }>{ this.singleCellOperationButton(tag) }</label>
        </div>
      );
    });
  }
}
  
class AllTagsInNotebookComponent extends TagsComponent {

  constructor(props: any) {
    super(props);
  }

  tagAlreadyInActiveCellTagsList(name: string) {
    return (this.props.widget as TagsWidget).activeCellContainsTag(name);
  }

  singleCellOperationButton(name: string) {
    if (this.tagAlreadyInActiveCellTagsList(name)) {
      return <img src={ require("../static/lightgrey_addcircle.svg") } />;
    } else {
      return <img src={ require("../static/darkgrey_addcircle.svg") } />;
    }
  }

  singleCellOperationHandler(name: string) {
    (this.props.widget as TagsWidget).addTagToActiveCell(name);
  }

  render() {
    let tags = this.props.tags as string[];
    var renderedTags = null;
    if (tags != null) {
      renderedTags = this.renderElementForTags(tags);
    }
    return (
      <div className="tag-section">
        <div className="tag-holder">
        { renderedTags }
        </div>
      </div>
    );
  }
}

class TagsForSelectedCellComponent extends TagsComponent {

  constructor(props: any) {
    super(props);
  }

  didFinishAddingTagWithName(name: string) {
    (this.props.widget as TagsWidget).didFinishAddingTags(name);
  }

  singleCellOperationButton(name: string) {
    return <img src={ require("../static/darkgrey_minuscircle.svg") } />;
  }

  singleCellOperationHandler(name: string) {
    (this.props.widget as TagsWidget).removeTagForSelectedCellWithName(name);
  }

  didPressedKeyIn(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.keyCode == 13) {
      let value = (event.target as HTMLInputElement).value;
      (event.target as HTMLInputElement).value = '';
      this.didFinishAddingTagWithName(value);
    }
    return event.keyCode;
  }

  render() {
    var renderedTags = null;
    if (this.props.tags != null) {
      let tags = (this.props.tags as string).toString().split(',');
      renderedTags = this.renderElementForTags(tags);
    }
    return (
      <div className="tag-holder">
        { renderedTags }
        <div className={ TAG_ADD_DIV } >
          <input className={ TAG_INPUT }
            defaultValue='Add Tag'
            onClick={ (event) => {
              this.setState({ plusIconShouldHide: true });
              let inputElement = event.target as HTMLInputElement;
              if (inputElement.value === 'Add Tag') {
                inputElement.value = '';
                inputElement.style.width = '63px';
                inputElement.style.minWidth = '63px';
              }
            } }
            onKeyDown={ (event) => {
              let inputElement = event.target as HTMLInputElement;
              inputElement.style.width = inputElement.value.length + "ch";
              if (this.didPressedKeyIn(event) == 13) {
                inputElement.value = 'Add Tag';
                inputElement.style.width = '50px';
                inputElement.style.minWidth = '50px';
                inputElement.blur();
                this.setState({ plusIconShouldHide: false });
              }
            } }
          />
          <label hidden={ this.state.plusIconShouldHide }>  +</label>
        </div>
      </div>
    );
  }

}

class TagOperationsComponent extends TagsComponent {

  constructor(props: any) {
    super(props);
  }

  renderSelectedTag() {
    if (this.props.selected !== null) {
      return ( <div
        key={ this.props.selected }
        className={ TAG_SELECTED_LABEL_DIV_CLASS }
      ><label hidden={ false }>{ this.props.selected as string }</label></div>);
    }
    else {
      return <div key="notagselected" className="no-tag-selected">No Tag Selected</div>;
    }
  }

  didClickRenameTag() {
    if (this.props.selected as string != null) {
      this.setState({ editingSelectedTag: true });
    }
  }

  didClickDeleteTag() {
    console.log('delete');
    this.props.selectHandler(this.props.selected, true);
    (this.props.widget as TagsWidget).removeTagFromAllCells(this.props.selected);
  }

  render() {
    var selected = this.renderSelectedTag();
    return (
      <div className="tag-section">
       <div> { selected } </div>
        <div 
          className={ "tag-operations-option" }
          onClick={ () => (this.props.widget as TagsWidget).selectAll(this.props.selected) }
        >
          Select All Cells with this Tag
        </div>
        <div 
          className={ "tag-operations-option"  }
          onClick={ () => this.didClickRenameTag() }
        >
          Rename Tag for All Cells
          <div key={ this.props.selected } className={ TAG_EDIT_DIV } hidden={ !this.state.editingSelectedTag }>
            <input className={ EDIT_TAG_INPUT }
                defaultValue={ this.props.selected }
                onKeyDown={ (event) => {
                  let inputElement = event.target as HTMLInputElement;
                  inputElement.style.width = inputElement.value.length + "ch";
                  if (event.keyCode == 13) {
                    (this.props.widget as TagsWidget).replaceName(this.props.selected, inputElement.value);
                    this.props.selectHandler(inputElement.value, false);
                    this.setState({ editingSelectedTag: false });
                  }
                } }
            />
          </div>
        </div> 
        <div 
          className={ "tag-operations-option"  }
          onClick={ () => this.didClickDeleteTag() }
        >
          Delete Tag from All Cells
        </div> 
      </div>
    );
  }
}

class TagsWidget extends Widget {

  constructor(notebook_Tracker: INotebookTracker) {
    super();
    this.notebookTracker = notebook_Tracker;
    Private.setWidget(this);
    Private.renderAllTagsNode();
  }

  containsTag(tag:string, cell: Cell) {
    if (cell === null) {
      return false;
    }
    let tagList = cell.model.metadata.get("tags") as string[];
    if (tagList) {
      for (let i=0; i< tagList.length; i++){
        if (tagList[i] === tag) {
          return true;
        }
      }
      return false;
    }
  }

  activeCellContainsTag(tag: string) {
    return this.containsTag(tag, this.currentActiveCell);
  }

  selectAll(name: string) {
    let notebookPanel = this.notebookTracker.currentWidget;
    let notebook = notebookPanel.notebook;
    let first:boolean = true;
    for (let i=0; i< notebookPanel.model.cells.length; i++) {
      let currentCell = notebook.widgets[i] as Cell;
      if (this.containsTag(name, currentCell)) {
        if (first === true) {
          notebook.activeCellIndex= i;
          notebook.deselectAll();
          first =false;
        }
        else {
          notebook.select(notebook.widgets[i] as Cell);
        }
      }
    }
    console.log('selected all');
  }

  replaceName(oldTag: string, newTag: string) {
    console.log(oldTag);
    console.log(newTag);
    let notebook = this.notebookTracker.currentWidget;
    let cells = notebook.model.cells;
    this.tagsListShallNotRefresh = true;
    for (var i=0; i<cells.length; i++) {
      let cellMetadata = cells.get(i).metadata;
      let cellTagsData = cellMetadata.get('tags') as string[];
      if (cellTagsData) {
        let results: string[] = [];
        for (var j=0; j<cellTagsData.length; j++) {
          if (cellTagsData[j] == oldTag) {
            results.push(newTag);
          } else {
            results.push(cellTagsData[j]);
          }
        }
        cellMetadata.set('tags', results);
      }
    }
    this.loadTagsForActiveCell();
    this.getAllTagsInNotebook();
    this.tagsListShallNotRefresh = false;
  }

  didFinishAddingTags(name: string) {
    write_tag(this.currentActiveCell, name, true);
    this.addTagIntoAllTagsList(name);
  }

  removeTagForSelectedCellWithName(name: string) {
    write_tag(this.currentActiveCell, name, false);
  }

  removeTagFromAllCells(name:string) {
    let notebookPanel = this.notebookTracker.currentWidget;
    let notebook = notebookPanel.notebook;
    for (let i=0; i< notebookPanel.model.cells.length; i++) {
      let currentCell = notebook.widgets[i] as Cell;
      if (this.containsTag(name, currentCell)) {
        write_tag(currentCell, name, false);
      }
    }
    var newArray = [...this.allTagsInNotebook]; // make a separate copy of the array
    var index = newArray.indexOf(name);
    newArray.splice(index, 1);
    for (var j=0; j<newArray.length; j++) {
      let name = newArray[j];
      this.addTagIntoAllTagsList(name);
    }
  }

  addTagIntoAllTagsList(name: string) {
    if (this.allTagsInNotebook == null) {
      this.allTagsInNotebook = [name];
    } else {
      if (this.allTagsInNotebook.indexOf(name) < 0) {
        this.allTagsInNotebook.push(name);
      }
    }
  }

  addTagToActiveCell(name:string) {
    write_tag(this.currentActiveCell, name, true);
    this.loadTagsForActiveCell();
  }

  getAllTagsInNotebook() {
    let notebook = this.notebookTracker.currentWidget;
    let cells = notebook.model.cells;
    this.allTagsInNotebook = null;
    for (var i=0; i<cells.length; i++) {
      let cellMetadata = cells.get(i).metadata;
      let cellTagsData = cellMetadata.get('tags') as string[];
      if (cellTagsData) {
        for (var j=0; j<cellTagsData.length; j++) {
          let name = cellTagsData[j];
          this.addTagIntoAllTagsList(name);
        }
      }
    }
    this.renderTagLabelsForAllTagsInNotebook(this.allTagsInNotebook);
  }

  loadTagsForActiveCell() {
    if (this.currentActiveCell != null) {
      let tags = this.currentActiveCell.model.metadata.get("tags");
      Private.setTagsListFor(Private.TAGS_FOR_CELL, tags);
    }
  }

  renderTagLabelsForAllTagsInNotebook(tags: string[]) {
    Private.setTagsListFor(Private.ALL_TAGS, tags);
  }

  currentActiveCell: Cell = null;
  allTagsInNotebook: [string] = null;
  notebookTracker: INotebookTracker = null;
  tagsListShallNotRefresh = false;
}

class TagsTool extends CellTools.Tool {

  constructor(notebook_Tracker: INotebookTracker, app: JupyterLab) {
    super();
    this.notebookTracker = notebook_Tracker;
    let layout = this.layout = new PanelLayout();
    this.addClass(TAG_TOOL_CLASS);
    this.widget = new TagsWidget(notebook_Tracker);
    layout.addWidget(this.widget);
  }

  /**
   * Handle a change to the active cell.
   */
  protected onActiveCellChanged(msg: Message): void {
    this.widget.currentActiveCell = this.parent.activeCell;
    this.widget.loadTagsForActiveCell();
  }

  protected onAfterAttach() {
    this.notebookTracker.currentWidget.context.ready.then(() => {
      this.widget.getAllTagsInNotebook(); 
    });
    this.notebookTracker.currentChanged.connect(() => {
      this.widget.getAllTagsInNotebook(); 
    })
  }

  protected onMetadataChanged(msg: ObservableJSON.ChangeMessage): void {
    if (!this.widget.tagsListShallNotRefresh) {
      this.widget.loadTagsForActiveCell();
      this.widget.getAllTagsInNotebook();
    }
  }

  private widget: TagsWidget = null;
  public notebookTracker: INotebookTracker = null;
}

namespace TagsTool {
  /**
   * The options used to initialize a metadata editor tool.
   */

}

namespace Private {

  let widget: TagsWidget = null;
  let tagsList: any = [];
  let allTagsList: any[] = [];

  export const ALL_TAGS = 0;
  export const TAGS_FOR_CELL = 1;

  export
  function setTagsListFor(type: number, list: any) {
    switch (type) {
      case ALL_TAGS:
        allTagsList = list;
        break;
      case TAGS_FOR_CELL:
        tagsList = list;
        break;
    }
    renderAllTagsNode();
  }

  export
  function setWidget(currentWidget: TagsWidget) {
    widget = currentWidget;
  }

  export
  function renderAllTagsNode() {
    ReactDOM.render((<TagsToolComponent widget={ widget } tagsList={ tagsList } allTagsList={ allTagsList } />), widget.node);
  }
}

/**
 * Initialization data for the jupyterlab-celltags extension.
 */
function activate(app: JupyterLab, cellTools: ICellTools, notebook_Tracker: INotebookTracker) {
  let tagsTool = new TagsTool(notebook_Tracker, app);
  cellTools.addItem({tool: tagsTool, rank: 1.7});
}

const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-celltags',
  autoStart: true,
  requires: [ICellTools, INotebookTracker],
  activate: activate
};

export default extension;
