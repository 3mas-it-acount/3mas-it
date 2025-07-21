import { render, screen } from '@testing-library/react';
import TicketModal from './TicketModal';
 
test('renders TicketModal when open', () => {
  render(<TicketModal isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
}); 