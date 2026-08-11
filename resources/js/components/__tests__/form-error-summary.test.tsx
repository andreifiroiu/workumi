import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormErrorSummary } from '../form-error-summary';

describe('FormErrorSummary', () => {
    it('shows errors whose field is not rendered by the form', () => {
        render(
            <FormErrorSummary
                errors={{ workOrderListId: 'The selected list is invalid.' }}
                rendered={['title', 'projectId']}
            />,
        );

        expect(
            screen.getByText('The selected list is invalid.'),
        ).toBeInTheDocument();
    });

    it('stays silent for errors the form already displays', () => {
        const { container } = render(
            <FormErrorSummary
                errors={{ title: 'The title field is required.' }}
                rendered={['title']}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no errors', () => {
        const { container } = render(
            <FormErrorSummary errors={{}} rendered={['title']} />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('ignores keys whose message is empty', () => {
        const { container } = render(
            <FormErrorSummary
                errors={{ someField: undefined }}
                rendered={[]}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('shows every unmapped error, not just the first', () => {
        render(
            <FormErrorSummary
                errors={{ a: 'First problem.', b: 'Second problem.' }}
                rendered={[]}
            />,
        );

        expect(screen.getByText('First problem.')).toBeInTheDocument();
        expect(screen.getByText('Second problem.')).toBeInTheDocument();
    });
});
