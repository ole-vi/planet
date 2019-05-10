import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { StateService } from '../state.service';

@Injectable()
export class TagsService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  getTags(db: string, parent: boolean) {
    return this.stateService.getCouchState('tags', parent ? 'parent' : 'local', { 'name': 'asc' }).pipe(
      map((tags: any[]) => {
        const tagCounts = tags.reduce(
          (counts: any, tag: any) => tag.linkId === undefined ? counts : { ...counts, [tag.tagId]: (counts[tag.tagId] || 0) + 1 },
          {}
        );
        return tags
          .map((tag: any) => ({ ...tag, count: tagCounts[tag._id] || 0 }))
          .filter((tag: any) => tag.db === db && tag.docType === 'definition')
          .map(this.fillSubTags);
      })
    );
  }

  filterTags(tags: any[], filterString: string): string[] {
    // Includes any tag with a sub tag that matches in addition to tags that match
    return tags.filter((tag: any) => tag.name.toLowerCase().indexOf(filterString.toLowerCase()) > -1);
  }

  updateTag(tag) {
    const { count, subTags, ...tagData } = tag;
    return this.couchService.post('tags', tagData);
  }

  findTag(tagKey: any, fullTags: any[]) {
    const fullTag = fullTags.find((dbTag: any) => dbTag._id === tagKey);
    return { ...(fullTag ? fullTag : { _id: tagKey, name: tagKey, attachedTo: [] }) };
  }

  fillSubTags(tag: any, index: number, tags: any[]) {
    return { ...tag, subTags: tags.filter(({ attachedTo }) => (attachedTo || []).indexOf(tag._id) > -1) };
  }

  attachTagsToDocs(db: string, docs: any[], tags: any[]) {
    const tagsObj = tags.reduce((obj, tagLink: any) => {
      if (tagLink.docType !== 'link' || tagLink.db !== db) {
        return obj;
      }
      const tag = { ...this.findTag(tagLink.tagId, tags), tagLink };
      return ({ ...obj, [tagLink.linkId]: obj[tagLink.linkId] ? [ ...obj[tagLink.linkId], tag ] : [ tag ] });
    }, {});
    return docs.map((doc: any) => ({
      ...doc,
      tags: tagsObj[doc._id] || []
    }));
  }

  tagBulkDocs(linkId: string, db: string, newTagIds: string[], currentTags: any[]) {
    // name property is needed for tags database queries
    const tagLinkDoc = (tagId) => ({ linkId, tagId, name: '', docType: 'link', db });
    return [
      ...newTagIds.filter(tagId => currentTags.findIndex((tag: any) => tag.tagId === tagId) === -1)
        .map(tagId => tagLinkDoc(tagId)),
      ...currentTags.filter((tag: any) => newTagIds.indexOf(tag.tagId) === -1)
        .map((tag: any) => ({ ...tag.tagLink, '_deleted': true }))
    ];
  }

  updateManyTags(data, dbName, { selectedIds, tagIds, indeterminateIds }) {
    const fullSelectedTags = tagIds.filter(tagId => indeterminateIds.indexOf(tagId) === -1);
    const items = selectedIds.map(id => data.find((item: any) => item._id === id));
    const newTags = items.map((item: any) =>
      this.tagBulkDocs(
        item._id, dbName, fullSelectedTags, item.tags.filter((tag: any) => indeterminateIds.indexOf(tag._id) === -1)
      )
    ).flat();
    return this.couchService.bulkDocs('tags', newTags);
  }

}
