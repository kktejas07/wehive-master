/**
 * The app's ErrorBoundary must report render crashes: errors React catches in
 * a boundary never reach window.onerror, so nothing else would record them.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { captureError } from '../analytics/errors/captureError';

jest.mock('../analytics/errors/captureError', () => ({ captureError: jest.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Boom() {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  let container;
  let root;
  let consoleError;

  beforeEach(() => {
    captureError.mockClear();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    consoleError.mockRestore();
  });

  it('reports a render crash as fatal with the component stack, and shows the fallback', () => {
    act(() => root.render(<ErrorBoundary><Boom /></ErrorBoundary>));

    expect(captureError).toHaveBeenCalledTimes(1);
    const [error, context] = captureError.mock.calls[0];
    expect(error.message).toBe('render failed');
    expect(context.scope).toBe('react_error_boundary');
    expect(context.severity).toBe('fatal');
    expect(context.props.component_stack).toContain('Boom');
    expect(container.textContent).toContain('Something went wrong');
  });

  it('reports nothing and renders children when nothing throws', () => {
    act(() => root.render(<ErrorBoundary><p>fine</p></ErrorBoundary>));
    expect(captureError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('fine');
  });

  it('renders a custom fallback when one is given', () => {
    act(() => root.render(<ErrorBoundary fallback={<p>custom</p>}><Boom /></ErrorBoundary>));
    expect(container.textContent).toBe('custom');
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
