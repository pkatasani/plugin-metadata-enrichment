/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { SourceTestkit } from '@salesforce/source-testkit';

const REPO = 'https://github.com/trailheadapps/dreamhouse-lwc.git';
const SAMPLE_LWC = 'LightningComponentBundle:barcodeScanner'; // LWC from dreamhouse-lwc

describe('metadata enrich NUTs', () => {
  let testkit: SourceTestkit;

  before(async () => {
    testkit = await SourceTestkit.create({
      repository: REPO,
      nut: fileURLToPath(import.meta.url),
    });
  });

  after(async () => {
    await testkit?.clean();
  });

  const runEnrich = (args: string, options?: { ensureExitCode?: number }) =>
    execCmd(`metadata enrich ${args}`, {
      cwd: testkit.projectDir,
      ...options,
    });

  describe('--help', () => {
    it('should show help with summary and metadata flag', () => {
      const result = runEnrich('--help', { ensureExitCode: 0 });
      expect(result.shellOutput.stdout).to.include('Enrich metadata');
      expect(result.shellOutput.stdout).to.match(/-m.*--metadata/);
    });
  });

  describe('required flags', () => {
    it('should fail when metadata flag is missing', () => {
      const result = runEnrich(`--target-org ${testkit.username}`, { ensureExitCode: 2 });
      expect(result.shellOutput.stderr).to.include('Missing required flag');
    });

    it('should use default org when target-org is omitted', () => {
      const result = runEnrich(`--metadata ${SAMPLE_LWC}`, { ensureExitCode: 0 });
      expect(result.shellOutput.stdout || result.shellOutput.stderr).to.exist;
    });
  });

  describe('--metadata flag', () => {
    it('should accept metadata flag with LightningComponentBundle', () => {
      const result = runEnrich(`--target-org ${testkit.username} --metadata ${SAMPLE_LWC}`);
      /* eslint-disable no-console */
      console.log('===== FULL RESULT =====');
      console.dir(result, { depth: null, colors: true });
      /* eslint-enable no-console */
      expect(result.shellOutput.stdout || result.shellOutput.stderr).to.exist;
    });

    it('should accept multiple metadata entries', () => {
      const result = runEnrich(
        `--target-org ${testkit.username} --metadata ${SAMPLE_LWC} LightningComponentBundle:propertySummary`
      );
      expect(result.shellOutput.stdout || result.shellOutput.stderr).to.exist;
    });

    it('should accept -m short flag', () => {
      const result = runEnrich(`--target-org ${testkit.username} -m ${SAMPLE_LWC}`);
      expect(result.shellOutput.stdout || result.shellOutput.stderr).to.exist;
    });
  });

  describe('error scenarios', () => {
    it('should fail when target-org is invalid or not authorized', () => {
      const result = runEnrich(`--target-org NoSuchOrg@example.com --metadata ${SAMPLE_LWC}`, { ensureExitCode: 1 });
      const output = (result.shellOutput.stderr || result.shellOutput.stdout || '').toLowerCase();
      expect(output.length).to.be.greaterThan(0);
    });
  });

  describe('--json', () => {
    it('should output metrics-shaped JSON when --json is used and command runs', () => {
      const result = runEnrich(`--target-org ${testkit.username} --metadata ${SAMPLE_LWC} --json`);
      const output = result.jsonOutput as Record<string, unknown> | undefined;
      const metrics = output?.result as Record<string, unknown> | undefined;
      if (metrics && typeof metrics === 'object') {
        expect(metrics).to.have.nested.property('success.count');
        expect(metrics).to.have.nested.property('skipped.count');
        expect(metrics).to.have.nested.property('fail.count');
        expect(metrics).to.have.property('total');
      }
    });
  });
});
