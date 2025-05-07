import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
// @ts-ignore
import anchorIdl from '../target/idl/arbor_program.json';
import fs from 'fs';

const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

